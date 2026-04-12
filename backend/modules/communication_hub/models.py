from django.db import models
from django.conf import settings
from django.utils import timezone

class MailAccount(models.Model):
    PROVIDER_CHOICES = [
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook'),
        ('hostinger', 'Hostinger'),
        ('custom', 'Custom'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mail_accounts')
    display_name = models.CharField(max_length=100, blank=True)
    email_address = models.EmailField()
    password = models.CharField(max_length=255)  # App Password for Gmail/Outlook
    
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='custom')
    
    imap_host = models.CharField(max_length=255)
    imap_port = models.IntegerField(default=993)
    smtp_host = models.CharField(max_length=255)
    smtp_port = models.IntegerField(default=587)
    
    is_active = models.BooleanField(default=True)
    is_etl_enabled = models.BooleanField(default=False, help_text="Enable automated Resume Extraction for this account")
    last_sync_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'email_address')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email_address} ({self.display_name})"

class MailMessage(models.Model):
    FOLDER_CHOICES = [
        ('inbox', 'Inbox'),
        ('sent', 'Sent'),
        ('drafts', 'Drafts'),
        ('starred', 'Starred'),
        ('trash', 'Trash'),
    ]

    account = models.ForeignKey(MailAccount, on_delete=models.CASCADE, related_name='messages')
    uid = models.CharField(max_length=100) # IMAP UID for uniqueness within account/folder
    
    subject = models.CharField(max_length=255, blank=True)
    sender = models.CharField(max_length=255)
    recipient = models.CharField(max_length=255)
    cc = models.TextField(blank=True)
    bcc = models.TextField(blank=True)
    
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    
    folder = models.CharField(max_length=20, choices=FOLDER_CHOICES, default='inbox')
    received_at = models.DateTimeField()
    synced_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('account', 'uid', 'folder')
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.subject} - {self.sender}"

class MailAttachment(models.Model):
    message = models.ForeignKey(MailMessage, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='mail_attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    content_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name
