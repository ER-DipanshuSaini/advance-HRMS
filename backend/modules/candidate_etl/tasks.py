import logging
from pathlib import Path

from celery import shared_task
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Q

from modules.communication_hub.manager import MailManager
from modules.communication_hub.models import MailAccount, MailAttachment

from .models import CandidateProfile, CandidateResume, ExperienceEntry, IngestionLog
from .services.parser_service import ParserService


logger = logging.getLogger(__name__)
MAX_RESUME_SIZE = 10 * 1024 * 1024


@shared_task
def run_candidate_extraction_pipeline():
    accounts = MailAccount.objects.filter(is_etl_enabled=True, is_active=True)
    for account in accounts.iterator():
        try:
            if account.sync_status != 'syncing':
                MailManager.sync_account_incremental(account)
        except Exception:
            logger.warning('Candidate mailbox sync failed for account %s', account.pk)

        attachments = MailAttachment.objects.filter(message__account=account).filter(
            Q(file_name__iendswith='.pdf') | Q(file_name__iendswith='.docx')
        ).exclude(ingestion_log__status__in=['SUCCESS', 'DUPLICATE'])
        for attachment_id in attachments.values_list('pk', flat=True).iterator():
            try:
                process_attachment(attachment_id)
            except Exception:
                logger.warning('Resume ingestion failed for attachment %s', attachment_id)
                attachment = MailAttachment.objects.select_related('message__account').filter(pk=attachment_id).first()
                if attachment:
                    save_ingestion_log(attachment, 'FAILED', 'Resume extraction failed.')


def save_ingestion_log(attachment, status, error=''):
    log, _ = IngestionLog.objects.get_or_create(
        attachment=attachment,
        defaults={
            'account_email': attachment.message.account.email_address,
            'email_uid': attachment.message.uid,
            'message': attachment.message,
            'status': status,
            'error_message': error,
        },
    )
    if log.status == 'FAILED':
        IngestionLog.objects.filter(pk=log.pk, status='FAILED').update(
            status=status, error_message=error,
        )


@transaction.atomic
def process_attachment(attachment_id):
    attachment = MailAttachment.objects.select_for_update().select_related('message__account').get(pk=attachment_id)
    if IngestionLog.objects.filter(attachment=attachment, status__in=['SUCCESS', 'DUPLICATE']).exists():
        return
    with attachment.file.open('rb') as source:
        data = source.read(MAX_RESUME_SIZE + 1)
    if len(data) > MAX_RESUME_SIZE:
        raise ValueError('Resume exceeds the file size limit.')

    extension = Path(attachment.file_name).suffix.lower()
    extract = ParserService.extract_docx_text if extension == '.docx' else ParserService.extract_raw_text
    text = extract(ContentFile(data))
    parsed = ParserService.parse_resume(text)
    email = parsed.get('email')
    phone = parsed.get('phone')
    if not email or not phone:
        raise ValueError('Resume must contain an email address and phone number.')

    candidate, created = CandidateProfile.objects.update_or_create(
        email=email.lower(), phone=phone,
        defaults={
            'name': parsed.get('name') or 'Unknown',
            'linkedin': parsed.get('linkedin'),
            'github': parsed.get('github'),
            'portfolio': parsed.get('portfolio'),
            'skills': ', '.join(parsed.get('skills', [])),
        },
    )
    resume, _ = CandidateResume.objects.get_or_create(profile=candidate)
    resume.resume_file.save(f'candidate-resume-{candidate.candidate_id}{extension}', ContentFile(data), save=False)
    resume.raw_text = text
    resume.parsed_json = parsed
    resume.save()

    candidate.experiences.all().delete()
    ExperienceEntry.objects.bulk_create([
        ExperienceEntry(profile=candidate, **{
            key: entry.get(key) for key in ('company', 'title', 'start_date', 'end_date')
        })
        for entry in parsed.get('experience', [])
    ])
    save_ingestion_log(attachment, 'SUCCESS' if created else 'DUPLICATE')
