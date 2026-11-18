from django.db import models
from django.conf import settings
from django.utils import timezone
from uuid import uuid4
from modules.organizations.models import Department
from modules.candidate_etl.models import CandidateProfile

class JobPosition(models.Model):
    LOCATION_MODE_CHOICES = [
        ('ON_SITE', 'On-Site'),
        ('HYBRID', 'Hybrid'),
        ('REMOTE', 'Remote'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('DRAFT', 'Draft'),
        ('CLOSED', 'Closed'),
    ]

    title = models.CharField(max_length=255, help_text="Target Role Name")
    job_id = models.CharField(max_length=20, unique=True, editable=False)
    
    department = models.ForeignKey(
        Department, 
        on_delete=models.CASCADE, 
        related_name='job_positions'
    )
    
    headcount = models.PositiveIntegerField(default=1, help_text="No. of Openings")
    
    location_mode = models.CharField(
        max_length=20, 
        choices=LOCATION_MODE_CHOICES, 
        default='ON_SITE'
    )
    location = models.CharField(
        max_length=255, 
        help_text="Hiring Location (e.g. New York, USA)"
    )
    
    # Experience (Years)
    min_experience = models.PositiveIntegerField(help_text="Min Experience in years")
    max_experience = models.PositiveIntegerField(help_text="Max Experience in years")
    
    # Salary Bracket (INR LPA)
    min_salary = models.DecimalField(max_digits=10, decimal_places=2, help_text="Min Salary (LPA)")
    max_salary = models.DecimalField(max_digits=10, decimal_places=2, help_text="Max Salary (LPA)")
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='DRAFT'
    )
    
    job_description = models.TextField(blank=True)
    requirements = models.TextField(blank=True, help_text="Special requirements or skills")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Job Position"
        verbose_name_plural = "Job Positions"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.job_id:
            self.job_id = f'REQ-{uuid4().hex[:16].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.job_id} - {self.title}"

class JobApplication(models.Model):
    STAGE_CHOICES = [
        ('SHORTLIST', 'Shortlist'),
        ('TELEPHONIC', 'Telephonic Round'),
        ('SCREENING', 'Screening'),
        ('TECHNICAL', 'Technical Interview'),
        ('MANAGER', 'Managerial Round'),
        ('HIRED', 'Hired'),
        ('REJECTED', 'Rejected'),
    ]

    job_position = models.ForeignKey(JobPosition, on_delete=models.CASCADE, related_name='applications')
    candidate = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE, related_name='job_applications')
    current_stage = models.CharField(max_length=50, choices=STAGE_CHOICES, default='SHORTLIST')
    employee = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('job_position', 'candidate')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.candidate.name} - {self.job_position.title} ({self.current_stage})"


class ApplicationStageChange(models.Model):
    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='stage_changes')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    previous_stage = models.CharField(max_length=50)
    new_stage = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)


class Interview(models.Model):
    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='interviews')
    interviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=30)
    technical_score = models.PositiveSmallIntegerField(null=True, blank=True)
    communication_score = models.PositiveSmallIntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True)


class Offer(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn'

    application = models.OneToOneField(JobApplication, on_delete=models.CASCADE, related_name='offer')
    annual_salary_lpa = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    updated_at = models.DateTimeField(auto_now=True)
