from django.contrib import admin
from .models import MailAccount, MailMessage, MailAttachment

@admin.register(MailAccount)
class MailAccountAdmin(admin.ModelAdmin):
    list_display = ('email_address', 'display_name', 'user', 'provider', 'is_active')
    list_filter = ('provider', 'is_active')
    search_fields = ('email_address', 'display_name')

@admin.register(MailMessage)
class MailMessageAdmin(admin.ModelAdmin):
    list_display = ('subject', 'sender', 'account', 'folder', 'is_read', 'received_at')
    list_filter = ('folder', 'is_read', 'account')
    search_fields = ('subject', 'sender', 'body_text')

@admin.register(MailAttachment)
class MailAttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'message', 'file_size', 'content_type')
