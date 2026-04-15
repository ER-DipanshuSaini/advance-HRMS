import imaplib
import email
from email.header import decode_header
from django.utils import timezone
from datetime import timedelta
from celery import shared_task
from django.core.files.base import ContentFile
from modules.communication_hub.models import MailAccount
from modules.communication_hub.manager import MailManager
from .models import CandidateProfile, CandidateResume, ExperienceEntry, IngestionLog
from .services.parser_service import ParserService
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_candidate_extraction_pipeline():
    """
    Scheduled task to run ETL for all enabled accounts.
    Processes resumes from the local database storage.
    """
    logger.info(">>> [EXTRACT_PIPELINE: START] Background process initiated.")
    
    accounts = MailAccount.objects.filter(is_etl_enabled=True, is_active=True)
    account_count = accounts.count()
    logger.info(f"--- [EXTRACT_PIPELINE: MID] Found {account_count} active accounts with ETL enabled.")
    
    for account in accounts:
        logger.info(f"--- [EXTRACT_PIPELINE: MID] Processing Account: {account.email_address}")
        
        # Incremental Sync
        try:
            logger.info(f"    [SYNC] Polling incremental updates for {account.email_address}...")
            MailManager.sync_account_incremental(account)
            logger.info(f"    [SYNC] Incremental sync successful for {account.email_address}.")
        except Exception as e:
            logger.error(f"    [SYNC_ERROR] FAILED for {account.email_address}: {e}")
            
        # Process Local
        logger.info(f"    [LOCAL_SCAN] Checking database for unprocessed resumes for {account.email_address}...")
        process_local_emails(account)
        logger.info(f"--- [EXTRACT_PIPELINE: MID] Finished processing Account: {account.email_address}")
    
    logger.info("<<< [EXTRACT_PIPELINE: FINAL] Background process completed successfully.")

def process_local_emails(account):
    """Scans local database for unprocessed emails and extracts resumes."""
    from modules.communication_hub.models import MailMessage
    
    # We only care about emails with attachments that aren't logged yet
    unprocessed_messages = MailMessage.objects.filter(
        account=account,
        attachments__isnull=False
    ).exclude(
        id__in=IngestionLog.objects.filter(account_email=account.email_address).values_list('message_id', flat=True)
    ).distinct()

    count = unprocessed_messages.count()
    logger.info(f"    [LOCAL_SCAN] Found {count} unprocessed messages with attachments.")

    for msg in unprocessed_messages:
        logger.info(f"    [MSG_PROCESS] Handling Message ID: {msg.id} (UID: {msg.uid})")
        process_individual_message(account, msg)

def process_individual_message(account, msg):
    """Parses attachments from a local MailMessage record."""
    attachments = msg.attachments.filter(file_name__iendswith='.pdf')
    
    if not attachments.exists():
        logger.info(f"    [MSG_SKIP] No PDF attachments found for Message {msg.id}.")
        return

    logger.info(f"    [MSG_PROCESS] Found {attachments.count()} PDF attachments.")

    for att in attachments:
        try:
            logger.info(f"      [PARSE: START] Extracting text from {att.file_name}...")
            # Re-read file content from storage
            file_data = att.file.read()
            text = ParserService.extract_raw_text(ContentFile(file_data))
            
            if not text:
                logger.warning(f"      [PARSE: FAIL] No text could be extracted from {att.file_name}.")
                IngestionLog.objects.create(
                    account_email=account.email_address, 
                    email_uid=msg.uid, 
                    message=msg,
                    status='FAILED', 
                    error_message="Could not extract text from PDF"
                )
                continue

            logger.info(f"      [PARSE: MID] Parsing candidate data from text...")
            parsed_data = ParserService.parse_resume(text)
            
            email_val = parsed_data.get('email')
            phone_val = parsed_data.get('phone')

            if not email_val or not phone_val:
                logger.warning(f"      [PARSE: FAIL] Incomplete data (Email/Phone missing) for {att.file_name}.")
                continue

            # Upsert Candidate
            logger.info(f"      [DATABASE: DB_SAVE] Saving candidate {parsed_data.get('name', 'Unknown')} to DB...")
            candidate, created = CandidateProfile.objects.update_or_create(
                email=email_val,
                phone=phone_val,
                defaults={
                    "name": parsed_data.get('name', 'Unknown'),
                    "linkedin": parsed_data.get('linkedin'),
                    "github": parsed_data.get('github'),
                    "portfolio": parsed_data.get('portfolio'),
                    "skills": ", ".join(parsed_data.get('skills', [])),
                }
            )

            # Store Resume
            resume_filename = f"candidate-resume-{candidate.candidate_id}.pdf"
            CandidateResume.objects.update_or_create(
                profile=candidate,
                defaults={
                    "resume_file": ContentFile(file_data, name=resume_filename),
                    "raw_text": text,
                    "parsed_json": parsed_data,
                }
            )

            # Store Experience
            ExperienceEntry.objects.filter(profile=candidate).delete()
            for exp in parsed_data.get('experience', []):
                ExperienceEntry.objects.create(
                    profile=candidate,
                    company=exp.get('company'),
                    title=exp.get('title'),
                    start_date=exp.get('start_date'),
                    end_date=exp.get('end_date')
                )

            status = 'SUCCESS' if created else 'DUPLICATE'
            logger.info(f"      [DATABASE: OK] Processed candidate: {candidate.email} (Status: {status})")
            
            IngestionLog.objects.create(
                account_email=account.email_address, 
                email_uid=msg.uid, 
                message=msg,
                status=status
            )
        except Exception as e:
            logger.error(f"      [PARSE_ERROR] Critical failure processing {att.file_name}: {e}")
