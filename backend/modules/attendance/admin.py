from django.contrib import admin
from .models import AttendanceRecord, LeaveRequest


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'check_in', 'check_out', 'work_hours', 'status')
    list_filter = ('status', 'date', 'user')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    ordering = ('-date',)
    date_hierarchy = 'date'


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'leave_type', 'start_date', 'end_date', 'status', 'reviewer')
    list_filter = ('status', 'leave_type', 'start_date')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    ordering = ('-created_at',)
    date_hierarchy = 'start_date'
    readonly_fields = ('created_at', 'updated_at')
