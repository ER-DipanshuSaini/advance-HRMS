from rest_framework import serializers
from .models import MailAccount, MailMessage, MailAttachment

class MailAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailAttachment
        fields = ['id', 'file_name', 'file_size', 'content_type', 'file']

class MailMessageSerializer(serializers.ModelSerializer):
    attachments = MailAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = MailMessage
        fields = [
            'id', 'account', 'uid', 'subject', 'sender', 'recipient', 
            'cc', 'bcc', 'body_text', 'body_html', 
            'is_read', 'is_starred', 'folder', 'received_at',
            'attachments'
        ]

class MailAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailAccount
        fields = [
            'id', 'display_name', 'email_address', 'provider',
            'imap_host', 'imap_port', 'smtp_host', 'smtp_port',
            'is_active', 'is_etl_enabled', 'sync_status', 'last_sync_at', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
