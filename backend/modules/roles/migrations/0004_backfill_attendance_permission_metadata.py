from django.db import migrations


def backfill_attendance_permission_metadata(apps, schema_editor):
    permission = apps.get_model('roles', 'Permission')
    rows = permission.objects.using(schema_editor.connection.alias).filter(code='attendance:view_all')
    for field, value in {
        'name': 'View All',
        'module': 'Attendance',
        'description': 'Allows viewing attendance records for all employees.',
    }.items():
        rows.filter(**{f'{field}__regex': r'^\s*$'}).update(**{field: value})


class Migration(migrations.Migration):
    dependencies = [('roles', '0003_recruitment_permissions')]
    operations = [
        migrations.RunPython(backfill_attendance_permission_metadata, migrations.RunPython.noop),
    ]
