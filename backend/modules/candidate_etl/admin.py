from django.contrib import admin
from .models import CandidateProfile, ExperienceEntry, CandidateResume, IngestionLog

class ExperienceInline(admin.TabularInline):
    model = ExperienceEntry
    extra = 0

class ResumeInline(admin.StackedInline):
    model = CandidateResume
    extra = 0

@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ('candidate_id', 'name', 'email', 'phone', 'created_at')
    search_fields = ('candidate_id', 'name', 'email', 'phone', 'skills')
    list_filter = ('created_at',)
    inlines = [ExperienceInline, ResumeInline]

@admin.register(IngestionLog)
class IngestionLogAdmin(admin.ModelAdmin):
    list_display = ('account_email', 'status', 'processed_at')
    list_filter = ('status', 'processed_at')
    search_fields = ('account_email', 'email_uid')
    readonly_fields = ('processed_at',)
