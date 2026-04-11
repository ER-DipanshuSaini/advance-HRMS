from django.core.management.base import BaseCommand
from modules.roles.models import Role, Permission
from modules.organizations.models import Department, Designation
from modules.users.models import User

class Command(BaseCommand):
    help = 'Seeds the database with core HireFlow IAM and Organization data.'

    def handle(self, *args, **kwargs):
        # 1. Clear existing data to avoid conflicts on fresh seed
        User.objects.all().delete()
        Role.objects.all().delete()
        Permission.objects.all().delete()
        Designation.objects.all().delete()
        Department.objects.all().delete()

        # 2. Permissions (Refactored for Concise Clarity)
        perms_data = [
            # Module: Employees
            ("users:view", "View", "Employees", "Allows viewing the full employee directory and profile summaries."),
            ("users:add", "Add", "Employees", "Allows onboarding new employees into the system."),
            ("users:update_basic", "Basic Update", "Employees", "Allows editing core info like name and contact details."),
            ("users:update_email", "Email Update", "Employees", "Allows editing work email addresses."),
            ("users:update_phone", "Phone Update", "Employees", "Allows updating direct contact numbers."),
            ("users:update_dept", "Department Shift", "Employees", "Allows moving an employee to a different department."),
            ("users:update_desig", "Designation Shift", "Employees", "Allows promoting or changing employee job titles."),

            # Module: Departments
            ("depts:view", "View", "Departments", "Allows viewing the organizational department list."),
            ("depts:add", "Add", "Departments", "Allows creating new operational departments."),
            ("depts:update", "Update", "Departments", "Allows updating department heads (HODs) or names."),

            # Module: Designations
            ("desig:view", "View", "Designations", "Allows viewing job roles and hierarchy codes."),
            ("desig:add", "Add", "Designations", "Allows creating new job titles and rank codes."),
            ("desig:update", "Update", "Designations", "Allows modifying job title names."),

            # Module: Profile
            ("profile:view", "View", "Profile", "Allows the user to view their own personal profile data."),
            ("profile:update_basic", "Basic", "Profile", "Allows the user to edit their own basic info."),
            ("profile:update_email", "Email", "Profile", "Allows the user to change their own login email."),
            ("profile:update_phone", "Phone", "Profile", "Allows the user to update their own contact number."),

            # Module: Security
            ("roles:view", "View", "Security", "Allows viewing the RBAC role and permission grid."),
            ("roles:add", "New", "Security", "Allows creating new custom access control roles."),
        ]
        
        perms = {}
        for code, name, module, desc in perms_data:
            p = Permission.objects.create(name=name, code=code, module=module, description=desc)
            perms[code] = p

        # 3. Roles
        admin_role = Role.objects.create(name="SuperAdmin")
        admin_role.permissions.set(list(perms.values()))
        
        emp_role = Role.objects.create(name="Employee")
        emp_role.permissions.set([perms["profile:view"]])

        # 4. Departments
        admin_dept = Department.objects.create(name="Administration", dept_id="AD01")
        sw_dept = Department.objects.create(name="Software Development", dept_id="SD01")

        # 5. Designations
        founder_desig = Designation.objects.create(name="Founder", designation_code="FND01", department=admin_dept)
        sde1_desig = Designation.objects.create(name="SDE 1", designation_code="SDE01", department=sw_dept)

        # 6. Users (Renamed to Employees)
        # Dipanshu Saini (SuperAdmin, Active)
        admin_user = User.objects.create_superuser(
            email="admin@hireflow.com",
            name="Dipanshu Saini",
            password="password",
            role=admin_role,
            department=admin_dept,
            designation=founder_desig,
            status='ACTIVE'
        )
        
        # Rajan Kumar (Employee, Active)
        emp_user = User.objects.create_user(
            email="employee@hireflow.com",
            name="Rajan Kumar",
            password="password",
            role=emp_role,
            department=sw_dept,
            designation=sde1_desig,
            status='ACTIVE'
        )

        # 7. Update HODs
        admin_dept.hod = admin_user
        admin_dept.save()
        
        sw_dept.hod = emp_user
        sw_dept.save()

        self.stdout.write(self.style.SUCCESS('Successfully seeded HireFlow Employee database!'))
