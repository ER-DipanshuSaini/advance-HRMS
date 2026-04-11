from rest_framework import serializers
from .models import User, EmployeeProfile
from modules.roles.serializers import RoleSerializer
from modules.organizations.serializers import DepartmentSerializer, DesignationSerializer

from datetime import datetime
import re

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = ['profile_picture', 'street', 'city', 'state', 'zip_code', 'professional_bio', 'work_type']

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    profile = EmployeeProfileSerializer(required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'role_name', 
            'department', 'department_name', 
            'designation', 'designation_name',
            'status', 'employee_id', 'phone_number', 'date_of_joining',
            'last_working_date', 'profile'
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Support FormData uploads for profile picture
        if hasattr(self, 'initial_data'):
            if 'profile.profile_picture' in self.initial_data:
                profile_data = profile_data or {}
                profile_data['profile_picture'] = self.initial_data['profile.profile_picture']
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # If 'name' is updated, maybe we should auto-split it?
        # Let's just handle them explicitly.
        
        instance.save()

        if profile_data is not None:
            profile, created = EmployeeProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance

class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone_number', 'date_of_joining',
            'department', 'designation', 'role', 'password'
        ]

    def create(self, validated_data):
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')
        dept = validated_data.get('department')
        
        name = f"{first_name} {last_name}".strip()
        
        # 1. Generate Employee ID
        # Format: H + Year(2 digits) + DeptCode + Initials + Seq
        year = datetime.now().strftime('%y') # '26'
        dept_code = dept.dept_id if dept and dept.dept_id else 'XX00'
        
        # Initials (e.g. Dipanshu Saini -> DS)
        initials = "".join([n[0].upper() for n in name.split() if n])[:2]
        if not initials: initials = "EM"
        
        base_id = f"H{year}{dept_code}{initials}"
        
        # Uniqueness sequence
        existing_count = User.objects.filter(employee_id__startswith=base_id).count()
        seq = str(existing_count + 1).zfill(2)
        final_emp_id = f"{base_id}{seq}"
        
        # 2. Generate Temporary Password
        # Format: First 5 of Name + @ + Year + HF
        clean_name = re.sub(r'[^a-zA-Z]', '', name)
        name_prefix = clean_name[:5].capitalize() if len(clean_name) >= 5 else clean_name.capitalize().ljust(5, 'x')
        temp_pass = f"{name_prefix}@{datetime.now().year}HF"

        # 3. Create User
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=first_name,
            last_name=last_name,
            password=temp_pass,
            employee_id=final_emp_id,
            phone_number=validated_data.get('phone_number', ''),
            date_of_joining=validated_data.get('date_of_joining', datetime.now().date()),
            department=dept,
            designation=validated_data.get('designation'),
            role=validated_data.get('role'),
            status='ACTIVE'
        )
        
        # Attach plain password for creation response
        user.plain_password = temp_pass
        return user
