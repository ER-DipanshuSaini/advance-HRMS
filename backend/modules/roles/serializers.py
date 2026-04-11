from rest_framework import serializers
from .models import Role, Permission

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'code', 'module', 'description']

class RoleSerializer(serializers.ModelSerializer):
    permissions_list = PermissionSerializer(source='permissions', many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        source='permissions',
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'permissions_list', 'permission_ids']
