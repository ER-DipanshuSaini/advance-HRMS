import datetime
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from modules.users.models import User
from modules.attendance.models import AttendanceRecord

class Command(BaseCommand):
    help = 'Seeds 102 past attendance records for all active users up to March 31, 2026'

    def handle(self, *args, **options):
        # Target end date
        end_date = datetime.date(2026, 3, 31)
        
        # Indian National & major festival holidays (approximate for 2025-2026)
        # format: (month, day)
        fixed_holidays = [
            (1, 26),  # Republic Day
            (8, 15),  # Independence Day
            (10, 2),  # Gandhi Jayanti
        ]
        
        # Specific festival dates for 2025-2026
        specific_holidays = [
            datetime.date(2025, 3, 14), # Holi 2025
            datetime.date(2025, 10, 20), # Diwali 2025
            datetime.date(2026, 3, 4),  # Holi 2026
            datetime.date(2026, 11, 8), # Diwali 2026
        ]

        def is_holiday(d):
            # Check weekends
            if d.weekday() >= 5: # 5=Sat, 6=Sun
                return True
            # Check fixed holidays
            for fh in fixed_holidays:
                if d.month == fh[0] and d.day == fh[1]:
                    return True
            # Check specific holidays
            if d in specific_holidays:
                return True
            return False

        users = User.objects.filter(is_active=True)
        if not users.exists():
            self.stdout.write(self.style.WARNING("No active users found to seed attendance."))
            return

        total_records_created = 0
        total_days_checked = 0

        # Build list of 102 valid working days going backwards from end_date
        working_days = []
        current_date = end_date
        
        while len(working_days) < 102:
            if not is_holiday(current_date):
                working_days.append(current_date)
            total_days_checked += 1
            current_date -= timedelta(days=1)
            
        working_days.reverse() # Chronological order

        for user in users:
            self.stdout.write(f"Seeding attendance for {user.email}...")
            user_records_created = 0
            
            for d in working_days:
                # 90% chance present, 5% absent, 5% half-day
                rand_val = random.random()
                
                check_in_time = None
                check_out_time = None
                status = 'ABSENT'
                
                if rand_val < 0.90:
                    status = 'PRESENT'
                    # Check in between 9:00 AM and 10:00 AM
                    check_in_time = datetime.time(9, random.randint(0, 59), random.randint(0, 59))
                    # Check out between 5:30 PM and 7:00 PM
                    check_out_time = datetime.time(17, random.randint(30, 59)) if random.random() < 0.5 else datetime.time(18, random.randint(0, 59))
                elif rand_val < 0.95:
                    status = 'HALF_DAY'
                    # Check in around 9 AM
                    check_in_time = datetime.time(9, random.randint(0, 59), random.randint(0, 59))
                    # Check out around 1 PM
                    check_out_time = datetime.time(13, random.randint(0, 59), random.randint(0, 59))
                else:
                    status = 'ABSENT'
                    
                # Create or update record
                record, created = AttendanceRecord.objects.get_or_create(
                    user=user,
                    date=d,
                    defaults={
                        'check_in': check_in_time,
                        'check_out': check_out_time,
                        'status': status
                    }
                )
                
                if created:
                    if check_in_time and check_out_time:
                        record.calculate_work_hours()
                        record.save()
                    user_records_created += 1
                    total_records_created += 1
                    
            self.stdout.write(self.style.SUCCESS(f"  --> Created {user_records_created} records for {user.email}."))

        self.stdout.write(self.style.SUCCESS(f"Successfully created {total_records_created} total attendance records!"))
