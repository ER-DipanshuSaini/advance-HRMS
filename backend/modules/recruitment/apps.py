from django.apps import AppConfig

class RecruitmentConfig(AppConfig):
    """
    Configuration for the Recruitment module, handling job positions and applications.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.recruitment'
    verbose_name = 'Recruitment Management'
