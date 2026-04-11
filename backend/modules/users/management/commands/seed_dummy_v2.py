import random
import re
from datetime import timedelta, date, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from modules.roles.models import Role, Permission
from modules.organizations.models import Department, Designation
from modules.users.models import User, EmployeeProfile
from modules.attendance.models import AttendanceRecord

class Command(BaseCommand):
    help = 'Generates massive dummy data without corrupting existing records.'

    def generate_emp_id(self, first_name, last_name, dept_code):
        year = timezone.now().strftime('%y')
        dc = dept_code if dept_code else 'XX00'
        name = f"{first_name} {last_name}".strip()
        initials = "".join([n[0].upper() for n in name.split() if n])[:2]
        if not initials: initials = "EM"
        base_id = f"H{year}{dc}{initials}"
        existing_count = User.objects.filter(employee_id__startswith=base_id).count()
        seq = str(existing_count + 1).zfill(2)
        return f"{base_id}{seq}"

    def generate_temp_password(self, first_name, last_name):
        name = f"{first_name} {last_name}".strip()
        clean_name = re.sub(r'[^a-zA-Z]', '', name)
        name_prefix = clean_name[:5].capitalize() if len(clean_name) >= 5 else clean_name.capitalize().ljust(5, 'x')
        return f"{name_prefix}@{timezone.now().year}HF"

    def is_working_day(self, check_date):
        # Exclude weekends (Saturday=5, Sunday=6)
        if check_date.weekday() >= 5:
            return False
        return True

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting HRMS Data Scalability Injection...")

        # 1. ROLES & PERMISSIONS
        self.stdout.write("-> Ensuring Roles (Manager, HR)...")
        all_perms = list(Permission.objects.all())
        emp_role = Role.objects.get(name="Employee")
        
        hr_role, _ = Role.objects.get_or_create(name="HR")
        hr_role.permissions.set(all_perms)  # HR gets all
        
        manager_role, _ = Role.objects.get_or_create(name="Manager")
        # Give managers some elevated permissions but maybe not all if we wanted, but let's give them all attendance plus view users.
        mgr_perms_targets = ['attendance:view_all', 'attendance:update_all', 'users:view', 'profile:view']
        mgr_perms = [p for p in all_perms if p.code in mgr_perms_targets or p.code.startswith('attendance')]
        manager_role.permissions.set(mgr_perms)

        # 2. DEPARTMENTS
        self.stdout.write("-> Seeding Departments & Designations...")
        new_depts = [
            ("AC01", "Account"),
            ("HR01", "Human Resource"),
            ("DA01", "Data Analyst")
        ]
        
        for dept_id, dept_name in new_depts:
            dept, _ = Department.objects.get_or_create(name=dept_name, defaults={'dept_id': dept_id})
            
            titles = [f"Junior {dept_name} Executive", f"Senior {dept_name} Specialist", f"{dept_name} Team Lead", f"Head of {dept_name}"]
            for level, title in enumerate(titles, start=1):
                d_code = f"{dept_id[:2].upper()}{level}0X{random.randint(10,99)}"
                Designation.objects.get_or_create(name=title, department=dept, defaults={'designation_code': d_code})

        existing_depts = Department.objects.exclude(name__in=["Account", "Human Resource", "Data Analyst"])
        for d in existing_depts:
            if not d.designations.exists():
                titles = [f"Associate {d.name}", f"Senior {d.name}", f"Lead {d.name}"]
                for level, title in enumerate(titles, start=1):
                    d_code = f"{d.dept_id[:2].upper()}{level}0X{random.randint(10,99)}"
                    Designation.objects.get_or_create(name=title, department=d, defaults={'designation_code': d_code})

        all_departments = list(Department.objects.all())
        all_roles = [emp_role, manager_role, hr_role]

        # 3. EMPLOYEES: Fix Old Employees
        self.stdout.write("-> Repairing and Backdating Existing Employees...")
        existing_users = User.objects.all()
        for u in existing_users:
            changed = False
            # Fix Employee ID
            if not u.employee_id:
                dept_code = u.department.dept_id if hasattr(u, 'department') and u.department else 'XX00'
                u.employee_id = self.generate_emp_id(u.first_name, u.last_name, dept_code)
                changed = True
            
            # Change Joining Date (70 - 150 days back)
            if u.date_of_joining.year == timezone.now().year and u.date_of_joining.month == timezone.now().month:
                # Assuming it's a recent default, backdate it
                days_back = random.randint(70, 150)
                u.date_of_joining = (timezone.now() - timedelta(days=days_back)).date()
                changed = True
                
            if changed:
                u.save()

        # Generate 14 New Employees
        self.stdout.write("-> Generating 14 New Employees...")
        names = [
            ("Rahul", "Verma"), ("Priya", "Sharma"), ("Amit", "Patel"), ("Sneha", "Reddy"),
            ("Vikram", "Singh"), ("Aisha", "Khan"), ("Rohan", "Gupta"), ("Kavita", "Desai"),
            ("Arjun", "Nair"), ("Meera", "Joshi"), ("Karan", "Malhotra"), ("Neha", "Kapoor"),
            ("Siddharth", "Menon"), ("Pooja", "Iyer")
        ]
        
        for first_name, last_name in names:
            email = f"{first_name.lower()}.{last_name.lower()}@hireflow.run"
            if not User.objects.filter(email=email).exists():
                dept = random.choice(all_departments)
                desigs = list(dept.designations.all())
                desig = random.choice(desigs) if desigs else None
                role = random.choice(all_roles)
                
                emp_id = self.generate_emp_id(first_name, last_name, dept.dept_id)
                temp_pass = self.generate_temp_password(first_name, last_name)
                
                days_back = random.randint(70, 150)
                doj = (timezone.now() - timedelta(days=days_back)).date()
                
                user = User.objects.create_user(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=temp_pass,
                    employee_id=emp_id,
                    date_of_joining=doj,
                    department=dept,
                    designation=desig,
                    role=role,
                    status='ACTIVE'
                )
                user.plain_password = temp_pass
                self.stdout.write(f"   Created {email} ({emp_id}) - Pass: {temp_pass}")

        # 4. PERFECT ATTENDANCE RECORD INJECTION
        self.stdout.write("-> Pushing Airtight Attendance Records...")
        all_active_users = User.objects.filter(status='ACTIVE')
        today = timezone.localdate()
        
        records_to_create = []
        
        # Clear old attendance to safely rebuild reliable contiguous histories
        AttendanceRecord.objects.all().delete()
        
        for u in all_active_users:
            current_date = u.date_of_joining
            while current_date <= today:
                if self.is_working_day(current_date):
                    # Guarantee standard 9 AM to 6 PM block
                    in_time = time(random.randint(8, 9), random.randint(0, 59))
                    out_time = time(random.randint(17, 18), random.randint(0, 59))
                    
                    records_to_create.append(AttendanceRecord(
                        user=u,
                        date=current_date,
                        check_in=in_time,
                        check_out=out_time,
                        status='PRESENT'
                    ))
                current_date += timedelta(days=1)
                
        # Bulk create for efficiency
        AttendanceRecord.objects.bulk_create(records_to_create, batch_size=1000)
        
        # We need to calculate work hours since bulk_create doesn't trigger save() logic
        for rec in AttendanceRecord.objects.all():
            rec.calculate_work_hours()
            rec.save(update_fields=['work_hours'])
            
        self.stdout.write(self.style.SUCCESS(f"Successfully generated {len(records_to_create)} attendance records!"))
        self.stdout.write(self.style.SUCCESS("All tasks completed safely!"))
