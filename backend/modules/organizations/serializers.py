from django.db.models import Count, Prefetch
from rest_framework import serializers
from .models import Department, Designation


def departments_with_details():
    return Department.objects.select_related('hod').annotate(
        employee_total=Count('user'),
    ).prefetch_related(Prefetch(
        'designations', queryset=Designation.objects.annotate(employee_total=Count('user')),
    ))


class DesignationSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Designation
        fields = ['id', 'name', 'designation_code', 'department', 'employee_count']

    def get_employee_count(self, obj):
        if hasattr(obj, 'employee_total'):
            return obj.employee_total
        return obj.user_set.count()

class DepartmentSerializer(serializers.ModelSerializer):
    designations = DesignationSerializer(many=True, read_only=True)
    employee_count = serializers.SerializerMethodField()
    hod_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'dept_id', 'hod', 'hod_name', 'designations', 'employee_count']

    def get_hod_name(self, obj):
        if obj.hod:
            return f"{obj.hod.first_name or ''} {obj.hod.last_name or ''}".strip() or obj.hod.email
        return None

    def get_employee_count(self, obj):
        if hasattr(obj, 'employee_total'):
            return obj.employee_total
        return obj.user_set.count()
