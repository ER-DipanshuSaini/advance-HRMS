from core.permissions import ActionPermission
from rest_framework import viewsets
from .models import Role, Permission
from .serializers import RoleSerializer, PermissionSerializer

class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [ActionPermission]
    action_permissions = {'list': 'roles:view', 'retrieve': 'roles:view'}
    queryset = Role.objects.all().prefetch_related('permissions')
    serializer_class = RoleSerializer

class PermissionViewSet(viewsets.ModelViewSet):
    permission_classes = [ActionPermission]
    action_permissions = {'list': 'roles:view', 'retrieve': 'roles:view'}
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
