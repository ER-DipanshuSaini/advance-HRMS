from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    MailAccountViewSet, MailMessageViewSet, 
    validate_mail_credentials, sync_mailbox, send_mail_view
)

router = SimpleRouter()
router.register(r'accounts', MailAccountViewSet, basename='mail-account')
router.register(r'messages', MailMessageViewSet, basename='mail-message')

urlpatterns = [
    path('', include(router.urls)),
    path('validate/', validate_mail_credentials, name='validate-mail'),
    path('sync/<int:account_id>/', sync_mailbox, name='sync-mailbox'),
    path('send/<int:account_id>/', send_mail_view, name='send-mail'),
]
