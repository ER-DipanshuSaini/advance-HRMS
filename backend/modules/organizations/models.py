from django.db import models
from django.core.exceptions import ValidationError

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    dept_id = models.CharField(max_length=10, unique=True, help_text="e.g. SD01, AD02")
    hod = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='headed_department'
    )

    def delete(self, *args, **kwargs):
        raise ValidationError("Departments are immutable and cannot be deleted once created.")

    def __str__(self):
        return f"{self.name} ({self.dept_id})"

class Designation(models.Model):
    name = models.CharField(max_length=100)
    designation_code = models.CharField(max_length=10, unique=True, help_text="e.g. SDE1, PM02")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='designations')

    class Meta:
        unique_together = ('name', 'department')

    def delete(self, *args, **kwargs):
        raise ValidationError("Designations are immutable and cannot be deleted once created.")

    def __str__(self):
        return f"{self.name} ({self.designation_code})"
