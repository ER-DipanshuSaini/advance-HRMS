from django.core.management.base import BaseCommand
from modules.roles.models import Role, Permission

class Command(BaseCommand):
    help = 'Safely injects new Attendance permissions without destroying existing data.'

    def handle(self, *args, **kwargs):
        perms_data = [
            # Self-Service (User logic)
            ('attendance:view_own', 'View Own', 'Attendance', 'Allows the user to view their own attendance records.'),
            ('attendance:mark_own', 'Mark Own', 'Attendance', 'Allows the user to check-in and check-out.'),
            ('attendance:update_own', 'Update Own', 'Attendance', 'Allows the user to submit modifications to their own attendance.'),
            
            # Elevated (Admin/HR logic)
            ('attendance:view_all', 'View All', 'Attendance', 'Allows viewing attendance records for all employees.'),
            ('attendance:add_all', 'Add All', 'Attendance', 'Allows marking attendance for any employee.'),
            ('attendance:update_all', 'Update All', 'Attendance', 'Allows overriding/modifying any employee attendance entry.'),
        ]

        # 1. Prepare/Inject the specific Permission objects
        self.stdout.write("Injecting Attendance permissions...")
        perm_objs = []
        for code, name, module, desc in perms_data:
            p, created = Permission.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'module': module,
                    'description': desc
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"+ Added {code}"))
            perm_objs.append(p)

        # 2. Add to Employee role
        try:
            emp_role = Role.objects.get(name="Employee")
            emp_perms = [p for p in perm_objs if p.code.endswith('_own')]
            emp_role.permissions.add(*emp_perms)
            self.stdout.write(self.style.SUCCESS(f"-> Appended '{[p.code for p in emp_perms]}' to 'Employee' role."))
        except Role.DoesNotExist:
            self.stdout.write(self.style.WARNING("Warning: 'Employee' role not found."))

        # 3. Add all to SuperAdmin role
        try:
            admin_role = Role.objects.get(name="SuperAdmin")
            admin_role.permissions.add(*perm_objs)
            self.stdout.write(self.style.SUCCESS(f"-> Appended all attendance perms to 'SuperAdmin' role."))
        except Role.DoesNotExist:
            self.stdout.write(self.style.WARNING("Warning: 'SuperAdmin' role not found."))

        self.stdout.write(self.style.SUCCESS("Attendance RBAC seeding completed safely!"))
