from rest_framework import serializers
from .models import AttendanceRecord, Holiday, LeaveRequest


class AttendanceRecordSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    date_display = serializers.SerializerMethodField()
    check_in_display = serializers.SerializerMethodField()
    check_out_display = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'user', 'user_name', 'date', 'date_display',
            'check_in', 'check_in_display',
            'check_out', 'check_out_display',
            'work_hours', 'status', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'work_hours', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.name

    def get_date_display(self, obj):
        return obj.date.strftime('%d %b %Y') if obj.date else None

    def get_check_in_display(self, obj):
        return obj.check_in.strftime('%I:%M %p') if obj.check_in else None

    def get_check_out_display(self, obj):
        return obj.check_out.strftime('%I:%M %p') if obj.check_out else None


class HolidaySerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Holiday
        fields = ['id', 'name', 'date', 'category', 'category_display', 'description']


class LeaveRequestSerializer(serializers.ModelSerializer):
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    total_days = serializers.ReadOnlyField()

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'user', 'user_name', 'leave_type', 'leave_type_display',
            'start_date', 'end_date', 'total_days', 'reason', 'status', 'status_display',
            'reviewer', 'reviewer_name', 'reviewed_at', 'reviewer_comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'reviewer', 'reviewed_at', 'reviewer_comment', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.email

    def get_reviewer_name(self, obj):
        if not obj.reviewer:
            return None
        name = f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()
        return name if name else obj.reviewer.email

    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("End date cannot be before start date.")
        return data
