from django.apps import AppConfig

class CandidateEtlConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.candidate_etl'
    verbose_name = 'Candidate ETL'
