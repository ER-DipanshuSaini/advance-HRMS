from django.db import models
from django.utils import timezone
import uuid

class CandidateProfile(models.Model):
    candidate_id = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    linkedin = models.URLField(max_length=500, null=True, blank=True)
    github = models.URLField(max_length=500, null=True, blank=True)
    portfolio = models.URLField(max_length=500, null=True, blank=True)
    
    skills = models.TextField(blank=True, help_text="Comma separated skills")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('email', 'phone')
        verbose_name = "Candidate Profile"
        verbose_name_plural = "Candidate Profiles"

    def save(self, *args, **kwargs):
        if not self.candidate_id:
            year = timezone.now().year
            self.candidate_id = f'HF-CAN-{year}-{uuid.uuid4().hex[:16].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.candidate_id} - {self.name}"

class ExperienceEntry(models.Model):
    profile = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE, related_name='experiences')
    company = models.CharField(max_length=255)
    title = models.CharField(max_length=255, null=True, blank=True)
    start_date = models.CharField(max_length=50, null=True, blank=True)
    end_date = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.title} at {self.company}"

class CandidateResume(models.Model):
    profile = models.OneToOneField(CandidateProfile, on_delete=models.CASCADE, related_name='resume')
    resume_file = models.FileField(upload_to='candidate-resume/%Y/%m/')
    raw_text = models.TextField(blank=True)
    parsed_json = models.JSONField(default=dict, blank=True)
    extracted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Resume of {self.profile.name}"

class IngestionLog(models.Model):
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('DUPLICATE', 'Duplicate/Updated'),
    ]
    
    account_email = models.EmailField()
    email_uid = models.CharField(max_length=100)
    message = models.ForeignKey('communication_hub.MailMessage', on_delete=models.SET_NULL, null=True, blank=True, related_name='etl_logs')
    attachment = models.OneToOneField(
        'communication_hub.MailAttachment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='ingestion_log',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account_email} - {self.status} at {self.processed_at}"
