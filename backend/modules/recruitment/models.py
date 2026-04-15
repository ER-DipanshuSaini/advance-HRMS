from django.db import models
from django.utils import timezone
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
            last_job = JobPosition.objects.all().order_by('-id').first()
            if last_job:
                try:
                    last_num = int(last_job.job_id.split('-')[1])
                    new_num = last_num + 1
                except (IndexError, ValueError):
                    new_num = 10001 + JobPosition.objects.count()
            else:
                new_num = 10001
            
            self.job_id = f"REQ-{new_num}"
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
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('job_position', 'candidate')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.candidate.name} - {self.job_position.title} ({self.current_stage})"
