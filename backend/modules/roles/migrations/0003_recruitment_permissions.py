from django.db import migrations


def create_recruitment_permissions(apps, schema_editor):
    permission = apps.get_model('roles', 'Permission')
    for code, name in (
        ('recruitment:view', 'View recruitment'),
        ('recruitment:add', 'Create job positions'),
        ('recruitment:update', 'Manage recruitment pipeline'),
    ):
        permission.objects.using(schema_editor.connection.alias).get_or_create(
            code=code, defaults={'name': name, 'module': 'Recruitment'},
        )


class Migration(migrations.Migration):
    dependencies = [('roles', '0002_permission_description')]
    operations = [migrations.RunPython(create_recruitment_permissions, migrations.RunPython.noop)]
