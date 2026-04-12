import imaplib
import email
from email.header import decode_header
from django.utils import timezone
from datetime import timedelta
from celery import shared_task
from django.core.files.base import ContentFile
from modules.communication_hub.models import MailAccount
from .models import CandidateProfile, CandidateResume, ExperienceEntry, IngestionLog
from .services.parser_service import ParserService
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_candidate_extraction_pipeline():
    """
    Scheduled task to run ETL for all enabled accounts.
    Runs 2x daily (configured in Celery Beat).
    """
    accounts = MailAccount.objects.filter(is_etl_enabled=True, is_active=True)
    for account in accounts:
        process_account_emails(account)

def process_account_emails(account):
    """Connects to IMAP and processes resumes from the last 12 hours."""
    try:
        mail = imaplib.IMAP4_SSL(account.imap_host, account.imap_port)
        mail.login(account.email_address, account.password)
        mail.select("inbox")

        # Time filter: 12 hours ago
        since_date = (timezone.now() - timedelta(hours=12)).strftime("%d-%b-%Y")
        status, messages = mail.search(None, f'(SINCE {since_date})')

        if status != 'OK':
            return

        for num in messages[0].split():
            # Check if already processed
            uid = num.decode('utf-8')
            if IngestionLog.objects.filter(account_email=account.email_address, email_uid=uid).exists():
                continue

            res, msg_data = mail.fetch(num, '(RFC822)')
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    process_individual_email(account, uid, msg)

        mail.close()
        mail.logout()
    except Exception as e:
        logger.error(f"ETL Error for {account.email_address}: {e}")

def process_individual_email(account, uid, msg):
    """Parses attachments from a single email and creates candidate profiles."""
    for part in msg.walk():
        if part.get_content_maintype() == 'multipart':
            continue
        if part.get('Content-Disposition') is None:
            continue

        filename = part.get_filename()
        if filename and filename.lower().endswith('.pdf'):
            # It's a PDF resume!
            file_data = part.get_payload(decode=True)
            
            # Temporary file object for pdfminer
            text = ParserService.extract_raw_text(ContentFile(file_data))
            if not text:
                IngestionLog.objects.create(account_email=account.email_address, email_uid=uid, status='FAILED', error_message="Could not extract text from PDF")
                continue

            parsed_data = ParserService.parse_resume(text)
            
            # Smart De-dupe: Email + Phone match
            email_val = parsed_data.get('email')
            phone_val = parsed_data.get('phone')

            if not email_val or not phone_val:
                # Basic validation failed
                continue

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

            # Store Resume File
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
            ExperienceEntry.objects.filter(profile=candidate).delete() # Clear old ones if updating
            for exp in parsed_data.get('experience', []):
                ExperienceEntry.objects.create(
                    profile=candidate,
                    company=exp.get('company'),
                    title=exp.get('title'),
                    start_date=exp.get('start_date'),
                    end_date=exp.get('end_date')
                )

            status = 'SUCCESS' if created else 'DUPLICATE'
            IngestionLog.objects.create(account_email=account.email_address, email_uid=uid, status=status)
