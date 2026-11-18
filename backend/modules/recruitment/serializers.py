from rest_framework import serializers
from decimal import Decimal

from django.contrib.auth import get_user_model
from modules.organizations.serializers import DepartmentSerializer
from .models import Interview, JobPosition, JobApplication, Offer

class JobApplicationSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.name', read_only=True)
    
    class Meta:
        model = JobApplication
        fields = ['id', 'candidate', 'candidate_name', 'current_stage', 'employee', 'updated_at']
        read_only_fields = ['employee']

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
        return f"₹{obj.min_salary:g}L - ₹{obj.max_salary:g}L"

    def get_current_process_stage(self, obj):
        # Logic: Get the most advanced stage from applications
        # For now, we take the most recent update's stage or 'Sourcing' if no apps
        stage = getattr(obj, 'latest_stage', None)
        if stage:
            return dict(JobApplication.STAGE_CHOICES)[stage]
        return "Sourcing"

    def validate(self, attrs):
        for lower, upper in [('min_experience', 'max_experience'), ('min_salary', 'max_salary')]:
            minimum = attrs.get(lower, getattr(self.instance, lower, None))
            maximum = attrs.get(upper, getattr(self.instance, upper, None))
            if minimum is not None and maximum is not None and maximum < minimum:
                raise serializers.ValidationError({upper: 'Must be greater than or equal to the minimum.'})
        return attrs


class InterviewSerializer(serializers.ModelSerializer):
    interviewer = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_active=True, status='ACTIVE'),
    )
    technical_score = serializers.IntegerField(min_value=1, max_value=5, required=False)
    communication_score = serializers.IntegerField(min_value=1, max_value=5, required=False)
    duration_minutes = serializers.IntegerField(min_value=5, max_value=480, default=30)
    interviewer_name = serializers.CharField(source='interviewer.get_full_name', read_only=True)

    class Meta:
        model = Interview
        fields = [
            'id', 'interviewer', 'interviewer_name', 'scheduled_at', 'duration_minutes',
            'technical_score', 'communication_score', 'feedback',
        ]


class OfferSerializer(serializers.ModelSerializer):
    annual_salary_lpa = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))

    class Meta:
        model = Offer
        fields = ['annual_salary_lpa', 'start_date', 'status', 'updated_at']
        read_only_fields = ['updated_at']

    def validate_status(self, status):
        transitions = {
            Offer.Status.DRAFT: {Offer.Status.SENT, Offer.Status.WITHDRAWN},
            Offer.Status.SENT: {Offer.Status.ACCEPTED, Offer.Status.DECLINED, Offer.Status.WITHDRAWN},
        }
        previous = self.instance.status if self.instance else Offer.Status.DRAFT
        if status != previous and status not in transitions.get(previous, ()):
            raise serializers.ValidationError('Invalid offer status transition.')
        return status

    def validate(self, attrs):
        if self.instance and self.instance.status != Offer.Status.DRAFT:
            for field in ('annual_salary_lpa', 'start_date'):
                if field in attrs and attrs[field] != getattr(self.instance, field):
                    raise serializers.ValidationError({field: 'Offer terms are locked after sending.'})
        return attrs
