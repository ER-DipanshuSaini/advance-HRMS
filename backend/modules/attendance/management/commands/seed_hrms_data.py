import datetime
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from modules.users.models import User
from modules.attendance.models import AttendanceRecord, Holiday, LeaveRequest

class Command(BaseCommand):
    help = 'Erase and re-seed attendance, leaves, and holidays for all employees from their date of joining.'

    def handle(self, *args, **options):
        # 1. Clear existing data
        self.stdout.write(self.style.WARNING("Clearing existing attendance and leave records..."))
        AttendanceRecord.objects.all().delete()
        LeaveRequest.objects.all().delete()
        # Clear 2025 holidays to re-seed correctly
        Holiday.objects.filter(date__year=2025).delete()

        # 2. Seed 2025 Holidays (Based on user-provided pattern and 2026 calendar)
        self.stdout.write("Seeding 2025 holidays...")
        holidays_2025 = [
            {'name': 'New Year', 'date': datetime.date(2025, 1, 1), 'category': 'FESTIVAL'},
            {'name': 'Republic Day', 'date': datetime.date(2025, 1, 26), 'category': 'NATIONAL'},
            {'name': 'Maha Shivratri', 'date': datetime.date(2025, 2, 26), 'category': 'FESTIVAL'},
            {'name': 'Holi (Dhulandi)', 'date': datetime.date(2025, 3, 14), 'category': 'FESTIVAL'},
            {'name': 'Eid ul-Fitr', 'date': datetime.date(2025, 3, 30), 'category': 'FESTIVAL'},
            {'name': 'Ram Navami', 'date': datetime.date(2025, 4, 6), 'category': 'FESTIVAL'},
            {'name': 'Mahavir Jayanti', 'date': datetime.date(2025, 4, 10), 'category': 'FESTIVAL'},
            {'name': 'Good Friday', 'date': datetime.date(2025, 4, 18), 'category': 'FESTIVAL'},
            {'name': 'Ambedkar Jayanti', 'date': datetime.date(2025, 4, 14), 'category': 'FESTIVAL'},
            {'name': 'Buddha Purnima', 'date': datetime.date(2025, 5, 12), 'category': 'FESTIVAL'},
            {'name': 'Eid al-Adha', 'date': datetime.date(2025, 6, 6), 'category': 'FESTIVAL'},
            {'name': 'Muharram', 'date': datetime.date(2025, 7, 6), 'category': 'FESTIVAL'},
            {'name': 'HireFlow Annual Day', 'date': datetime.date(2025, 7, 10), 'category': 'COMPANY'},
            {'name': 'Independence Day', 'date': datetime.date(2025, 8, 15), 'category': 'NATIONAL'},
            {'name': 'Raksha Bandhan', 'date': datetime.date(2025, 8, 9), 'category': 'FESTIVAL'},
            {'name': 'Janmashtami', 'date': datetime.date(2025, 8, 16), 'category': 'FESTIVAL'},
            {'name': 'Eid-e-Milad', 'date': datetime.date(2025, 9, 5), 'category': 'FESTIVAL'},
            {'name': 'Gandhi Jayanti', 'date': datetime.date(2025, 10, 2), 'category': 'NATIONAL'},
            {'name': 'Dussehra', 'date': datetime.date(2025, 10, 3), 'category': 'FESTIVAL'},
            {'name': 'Diwali (Deepavali)', 'date': datetime.date(2025, 10, 20), 'category': 'FESTIVAL'},
            {'name': 'Wellness Retreat Day', 'date': datetime.date(2025, 11, 20), 'category': 'COMPANY'},
            {'name': 'Guru Nanak Jayanti', 'date': datetime.date(2025, 11, 5), 'category': 'FESTIVAL'},
            {'name': 'Christmas Day', 'date': datetime.date(2025, 12, 25), 'category': 'FESTIVAL'},
        ]
        for h in holidays_2025:
            Holiday.objects.get_or_create(date=h['date'], defaults=h)

        # 3. Seed Attendance and Leaves
        today = timezone.localdate()
        holiday_dates = set(Holiday.objects.all().values_list('date', flat=True))
        users = User.objects.all()

        total_attendance = 0
        total_leaves = 0

        for user in users:
            self.stdout.write(f"Seeding data for {user.email}...")
            start_date = user.date_of_joining if user.date_of_joining else datetime.date(2025, 1, 1)
            current_date = start_date

            while current_date <= today:
                # Skip if weekend
                if current_date.weekday() >= 5:
                    current_date += timedelta(days=1)
                    continue
                
                # Skip if holiday
                if current_date in holiday_dates:
                    # Optional: We could create a HOLIDAY attendance record, but user said "don't mark attendance"
                    current_date += timedelta(days=1)
                    continue

                # Decide if user is on leave (random Segment)
                if random.random() < 0.03: # 3% chance to start a leave
                    leave_days = random.randint(1, 3)
                    end_leave_date = current_date + timedelta(days=leave_days - 1)
                    # Don't exceed today
                    if end_leave_date > today:
                        end_leave_date = today

                    leave_type = random.choice(['CL', 'SL', 'PL'])
                    # Basic check for overlapping or future leaves (skipped for simplicity in seeding)
                    LeaveRequest.objects.create(
                        user=user,
                        leave_type=leave_type,
                        start_date=current_date,
                        end_date=end_leave_date,
                        status='APPROVED',
                        reason="Personal leave",
                    )
                    total_leaves += 1
                    current_date = end_leave_date + timedelta(days=1)
                    continue

                # Decide if absent
                if random.random() < 0.02: # 2% chance of being absent
                    AttendanceRecord.objects.create(
                        user=user,
                        date=current_date,
                        status='ABSENT'
                    )
                    total_attendance += 1
                    current_date += timedelta(days=1)
                    continue

                # Otherwise, MARK AS PRESENT
                check_in = datetime.time(random.randint(8, 9), random.randint(0, 59), random.randint(0, 59))
                check_out = datetime.time(random.randint(17, 18), random.randint(0, 59), random.randint(0, 59))
                
                # Introduce occasional half-days (limited hours)
                is_half_day = random.random() < 0.05
                if is_half_day:
                    check_out = datetime.time(random.randint(13, 14), random.randint(0, 59), random.randint(0, 59))
                
                record = AttendanceRecord.objects.create(
                    user=user,
                    date=current_date,
                    check_in=check_in,
                    check_out=check_out,
                    status='PRESENT' # calculate_work_hours might override to HALF_DAY
                )
                record.calculate_work_hours()
                record.save()
                
                total_attendance += 1
                current_date += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {total_attendance} attendance records and {total_leaves} leave segments."))
