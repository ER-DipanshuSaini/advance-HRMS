import threading
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.files.base import ContentFile
from .models import MailAccount, MailMessage, MailAttachment
from .serializers import MailAccountSerializer, MailMessageSerializer, MailAttachmentSerializer
from .manager import MailManager

class MailAccountViewSet(viewsets.ModelViewSet):
    serializer_class = MailAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MailAccount.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        from .tasks import full_initial_sync_task
        account = serializer.save(user=self.request.user)
        # 1. Sync first batch synchronously for better UX
        MailManager.sync_account_incremental(account)
        # 2. Trigger Full Historical Sync in background
        full_initial_sync_task.delay(account.id)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_mail_credentials(request):
    """
    Validates IMAP/SMTP credentials before saving an account.
    """
    config = request.data
    required_fields = ['email_address', 'password', 'imap_host', 'imap_port', 'smtp_host', 'smtp_port']
    
    # Map 'email_address' to 'email' for the manager
    val_config = {**config, 'email': config.get('email_address')}
    
    if not all(val_config.get(f) for f in ['email', 'password', 'imap_host', 'smtp_host']):
        return Response({'success': False, 'error': 'Missing required fields'}, status=400)

    success, error = MailManager.validate_credentials(val_config)
    if success:
        return Response({'success': True, 'message': 'Credentials validated successfully!'})
    else:
        return Response({'success': False, 'error': error}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_mailbox(request, account_id):
    """
    Triggers an incremental sync for a specific account.
    Fails if a full sync is already in progress.
    """
    try:
        account = MailAccount.objects.get(id=account_id, user=request.user)
    except MailAccount.DoesNotExist:
        return Response({'error': 'Account not found'}, status=404)

    if account.sync_status == 'syncing':
        return Response({
            'success': False, 
            'error': 'Background full sync is currently in progress. Refreshing is disabled.'
        }, status=400)

    # Perform Incremental Sync (New emails only)
    new_count = MailManager.sync_account_incremental(account)

    return Response({
        'success': True, 
        'new_emails': new_count,
        'last_sync': account.last_sync_at,
        'sync_status': account.sync_status
    })

class MailMessageViewSet(viewsets.ModelViewSet):
    serializer_class = MailMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MailMessage.objects.filter(account__user=self.request.user)
        
        # Only apply listing filters (account/folder) if we are not looking up a specific ID
        if not self.kwargs.get('pk'):
            account_id = self.request.query_params.get('account_id')
            folder = self.request.query_params.get('folder', 'inbox')
            
            if account_id:
                queryset = queryset.filter(account_id=account_id)
            
            if folder == 'starred':
                queryset = queryset.filter(is_starred=True)
            elif folder:
                queryset = queryset.filter(folder=folder)
            
        return queryset.order_by('-received_at')

    @action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        message = self.get_object()
        message.is_starred = not message.is_starred
        message.save()
        return Response({'success': True, 'is_starred': message.is_starred})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_mail_view(request, account_id):
    """
    Sends an email and stores it in the 'Sent' folder.
    Supports attachments via request.FILES.
    """
    try:
        account = MailAccount.objects.get(id=account_id, user=request.user)
    except MailAccount.DoesNotExist:
        return Response({'error': 'Account not found'}, status=404)

    data = request.data
    attachments = request.FILES.getlist('attachments')
    
    success, error = MailManager.send_email(
        account, 
        data.get('to'), 
        data.get('subject'), 
        data.get('body'),
        cc=data.get('cc'),
        bcc=data.get('bcc'),
        attachments=attachments
    )

    if success:
        # Save to Sent folder
        msg = MailMessage.objects.create(
            account=account,
            uid=f"sent_{int(timezone.now().timestamp())}",
            folder='sent',
            subject=data.get('subject'),
            sender=account.email_address,
            recipient=data.get('to'),
            body_html=data.get('body'),
            received_at=timezone.now()
        )
        # Save attachments to the record
        for f in attachments:
            MailAttachment.objects.create(
                message=msg,
                file=f,
                file_name=f.name,
                file_size=f.size,
                content_type=f.content_type
            )
        return Response({'success': True})
    else:
        return Response({'success': False, 'error': error}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_attachment(request, attachment_id):
    """
    Returns the attachment file.
    """
    try:
        attachment = MailAttachment.objects.get(id=attachment_id, message__account__user=request.user)
        response = Response(status=status.HTTP_200_OK)
        # In a real app, you might use Django's FileResponse or just return the URL
        # Here we return metadata + URL for simplicity, or we could redirect
        return Response({
            'file_name': attachment.file_name,
            'url': request.build_absolute_uri(attachment.file.url)
        })
    except MailAttachment.DoesNotExist:
        return Response({'error': 'Attachment not found'}, status=404)
