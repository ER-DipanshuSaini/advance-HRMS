import os
import logging
from celery import Celery
from celery.signals import after_setup_logger
import celery.schedules

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('hireflow')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule
app.conf.beat_schedule = {
    'daily-candidate-resume-extraction': {
        'task': 'modules.candidate_etl.tasks.run_candidate_extraction_pipeline',
        'schedule': celery.schedules.crontab(hour=1, minute=0),  # Runs daily at 1:00 AM
    },
}

@after_setup_logger.connect
def setup_celery_logging(logger, **kwargs):
    """
    Configures Celery logging to write to a dedicated file in the backend folder.
    """
    from django.conf import settings
    
    log_dir = os.path.join(settings.BASE_DIR, 'celery-logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    log_file = os.path.join(log_dir, 'celery.log')
    
    # Create handler
    handler = logging.FileHandler(log_file)
    
    # Create formatter
    formatter = logging.Formatter(
        '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
    )
    handler.setFormatter(formatter)
    
    # Add handler to the logger
    logger.addHandler(handler)
    logger.info(f"Celery logging initialized. Writing to {log_file}")

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
