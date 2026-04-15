from celery import shared_task
from .models import MailAccount
from .manager import MailManager
import logging

logger = logging.getLogger(__name__)

@shared_task
def full_initial_sync_task(account_id):
    """
    Performs a full historical sync for an account.
    """
    try:
        account = MailAccount.objects.get(id=account_id)
        logger.info(f">>> [SYNC_SESSION: START] Initiating full sync for {account.email_address}")
        
        account.sync_status = 'syncing'
        account.save()
        logger.info(f"--- [SYNC_SESSION: MID] Sync status set to 'syncing' for {account.email_address}")

        # Step 1: Initial Synchronous Sync
        for folder in ['INBOX', 'SENT']:
            logger.info(f"    [STEP 1: INCREMENTAL] Syncing {folder} folder...")
            # We internally map folder names in fetch_latest_emails now
            MailManager.sync_account_to_db(account, limit=20, folder=folder)
        logger.info(f"    [STEP 1: OK] Incremental sync finished for all core folders.")

        # Step 2: Full Historical Sync
        for folder in ['INBOX', 'SENT']:
            logger.info(f"    [STEP 2: HISTORICAL] Syncing {folder} folder (deep scan)...")
            MailManager.sync_account_to_db(account, limit=500, folder=folder)
        logger.info(f"    [STEP 2: OK] Historical sync finished for all core folders.")

        account.sync_status = 'completed'
        account.save()
        logger.info(f"<<< [SYNC_SESSION: FINAL] Full sync cycle completed for {account.email_address}. Status: COMPLETED.")

    except MailAccount.DoesNotExist:
        logger.error(f"[SYNC_SESSION: ERROR] Account ID {account_id} not found in database.")
    except Exception as e:
        if 'account' in locals():
            account.sync_status = 'failed'
            account.save()
        logger.error(f"[SYNC_SESSION: CRITICAL] Error during sync for account {account_id}: {e}")
