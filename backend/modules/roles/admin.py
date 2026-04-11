from django.contrib import admin
from .models import Permission, Role

@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'module', 'description')
    list_filter = ('module',)
    search_fields = ('code', 'name', 'module')
    ordering = ('module', 'code')

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_permission_count')
    search_fields = ('name',)
    filter_horizontal = ('permissions',)

    def get_permission_count(self, obj):
        return obj.permissions.count()
    get_permission_count.short_description = 'Permissions'
