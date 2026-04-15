from rest_framework import serializers
from .models import JobPosition, JobApplication
from modules.organizations.serializers import DepartmentSerializer

class JobApplicationSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.name', read_only=True)
    
    class Meta:
        model = JobApplication
        fields = ['id', 'candidate', 'candidate_name', 'current_stage', 'updated_at']

class JobPositionSerializer(serializers.ModelSerializer):
    department_details = DepartmentSerializer(source='department', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    opening_date = serializers.SerializerMethodField()
    current_process_stage = serializers.SerializerMethodField()
    experience_range = serializers.SerializerMethodField()
    budget_range = serializers.SerializerMethodField()
    
    class Meta:
        model = JobPosition
        fields = [
            'id', 'job_id', 'title', 'department', 'department_name', 'department_details',
            'headcount', 'location_mode', 'location', 'experience_range',
            'min_experience', 'max_experience', 'budget_range',
            'min_salary', 'max_salary', 'status', 'current_process_stage',
            'opening_date', 'job_description', 'requirements', 'created_at'
        ]
        read_only_fields = ['job_id', 'created_at']

    def get_opening_date(self, obj):
        return obj.created_at.strftime("%d %b, %Y")

    def get_experience_range(self, obj):
        return f"{obj.min_experience}-{obj.max_experience} Yrs"

    def get_budget_range(self, obj):
        return f"₹{int(obj.min_salary)}L - ₹{int(obj.max_salary)}L"

    def get_current_process_stage(self, obj):
        # Logic: Get the most advanced stage from applications
        # For now, we take the most recent update's stage or 'Sourcing' if no apps
        latest_app = obj.applications.all().order_by('-updated_at').first()
        if latest_app:
            return latest_app.get_current_stage_display()
        return "Sourcing"
