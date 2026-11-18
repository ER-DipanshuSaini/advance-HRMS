import logging

from celery import shared_task
from django.utils import timezone

from .manager import MailManager
from .models import MailAccount


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def full_initial_sync_task(self, account_id, historical=True):
    account = MailAccount.objects.filter(pk=account_id).first()
    if account is None:
        return
    MailAccount.objects.filter(pk=account_id).update(sync_status='syncing')
    try:
        if historical:
            MailManager.sync_account_full_historical(account)
        else:
            MailManager.sync_account_incremental(account)
    except Exception as exc:
        logger.warning('Mailbox sync failed for account %s', account_id)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
        MailAccount.objects.filter(pk=account_id).update(sync_status='failed')
        raise
    MailAccount.objects.filter(pk=account_id).update(
        sync_status='completed', last_sync_at=timezone.now(),
    )
