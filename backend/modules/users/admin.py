from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, EmployeeProfile

class EmployeeProfileInline(admin.StackedInline):
    model = EmployeeProfile
    can_delete = False
    verbose_name_plural = 'Employee Profile'
    fk_name = 'user'

@admin.register(User)
class UserAdmin(UserAdmin):
    inlines = (EmployeeProfileInline,)
    list_display = ('email', 'get_full_name', 'employee_id', 'status', 'role', 'department', 'designation', 'is_staff')
    list_filter = ('status', 'role', 'department', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name', 'employee_id')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Workforce Identity', {'fields': ('employee_id', 'status', 'date_of_joining', 'last_working_date', 'role', 'department', 'designation')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password', 'role', 'department', 'designation'),
        }),
    )

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.name
    get_full_name.short_description = 'Full Name'
