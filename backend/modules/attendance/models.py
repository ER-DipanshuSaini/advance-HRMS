from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal


class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('HALF_DAY', 'Half Day'),
        ('ABSENT', 'Absent'),
        ('HOLIDAY', 'Holiday'),
        ('LEAVE', 'On Leave'),
        ('WEEKEND', 'Weekend'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField(default=timezone.localdate)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    work_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} — {self.date} [{self.status}]"

    def calculate_work_hours(self):
        """Calculate total work hours when checking out."""
        if self.check_in and self.check_out:
            from datetime import datetime, date as date_type
            check_in_dt = datetime.combine(date_type.today(), self.check_in)
            check_out_dt = datetime.combine(date_type.today(), self.check_out)
            diff = check_out_dt - check_in_dt
            total_hours = diff.total_seconds() / 3600
            self.work_hours = round(Decimal(str(total_hours)), 2)

            # Set half-day if less than 4.5 hours
            if total_hours < 4.5:
                self.status = 'HALF_DAY'
            else:
                self.status = 'PRESENT'


class Holiday(models.Model):
    CATEGORY_CHOICES = [
        ('NATIONAL', 'National Holiday'),
        ('COMPANY', 'Company Holiday'),
        ('FESTIVAL', 'Festival'),
    ]

    name = models.CharField(max_length=100)
    date = models.DateField(unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='FESTIVAL')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.name} ({self.date}) — {self.get_category_display()}"


class LeaveRequest(models.Model):
    LEAVE_TYPES = [
        ('CL', 'Casual Leave'),
        ('SL', 'Sick Leave'),
        ('PL', 'Privilege Leave'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Reviewer Tracking
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_leaves'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer_comment = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_leave_type_display()} ({self.start_date} to {self.end_date})"

    @property
    def total_days(self):
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0
