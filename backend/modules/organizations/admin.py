from django.contrib import admin
from .models import Department, Designation

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'dept_id', 'hod')
    list_filter = ('hod',)
    search_fields = ('name', 'dept_id')
    ordering = ('name',)

@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ('name', 'designation_code', 'department')
    list_filter = ('department',)
    search_fields = ('name', 'designation_code')
    ordering = ('department', 'name')
