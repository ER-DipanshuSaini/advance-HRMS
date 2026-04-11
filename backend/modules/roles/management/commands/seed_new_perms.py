from django.core.management.base import BaseCommand
from modules.roles.models import Role, Permission

class Command(BaseCommand):
    help = 'Safely injects new Holidays and Leaves permissions'

    def handle(self, *args, **kwargs):
        perms_data = [
            # Holidays
            ('holidays:add', 'Add Holiday', 'Holidays', 'Allows adding new holidays.'),
            ('holidays:update', 'Update Holiday', 'Holidays', 'Allows updating existing holidays.'),
            
            # Leaves
            ('leaves:view_own', 'View Own Leaves', 'Leaves', 'Allows viewing own leaves.'),
            ('leaves:view_all', 'View All Leaves', 'Leaves', 'Allows viewing everyone leaves.'),
            ('leaves:apply_own', 'Apply Leaves', 'Leaves', 'Allows the user to apply for their own leaves.'),
            ('leaves:add_all', 'Add Employee Leaves', 'Leaves', 'Allows adding leaves on behalf of employees.'),
            ('leaves:review_all', 'Review Employee Leaves', 'Leaves', 'Allows approving or rejecting employee leaves.'),
        ]

        self.stdout.write("Injecting New Module permissions...")
        perm_objs = []
        for code, name, module, desc in perms_data:
            p, created = Permission.objects.get_or_create(
                code=code,
                defaults={'name': name, 'module': module, 'description': desc}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"+ Added {code}"))
            perm_objs.append(p)

        # 2. Add to Employee role
        try:
            emp_role = Role.objects.get(name="Employee")
            emp_perms = [p for p in perm_objs if p.code.endswith('_own')]
            emp_role.permissions.add(*emp_perms)
            self.stdout.write(self.style.SUCCESS(f"-> Appended to 'Employee' role."))
        except Role.DoesNotExist:
            self.stdout.write(self.style.WARNING("Warning: 'Employee' role not found."))

        # 3. Add all to SuperAdmin role
        try:
            admin_role = Role.objects.get(name="SuperAdmin")
            admin_role.permissions.add(*perm_objs)
            # Make sure SuperAdmin also gets leaves:view_all to fix potential bugs
            v, _ = Permission.objects.get_or_create(code='attendance:view_all')
            admin_role.permissions.add(v)
            self.stdout.write(self.style.SUCCESS(f"-> Appended all to 'SuperAdmin' role."))
        except Role.DoesNotExist:
            self.stdout.write(self.style.WARNING("Warning: 'SuperAdmin' role not found."))

        self.stdout.write(self.style.SUCCESS("New RBAC seeding completed safely!"))
