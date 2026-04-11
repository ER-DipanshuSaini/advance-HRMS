from django.core.management.base import BaseCommand
from modules.attendance.models import Holiday
from datetime import date

class Command(BaseCommand):
    help = 'Seed the database with Indian holidays and festivals for 2026'

    def handle(self, *args, **options):
        holidays_data = [
            # National Holidays
            {'name': 'Republic Day', 'date': date(2026, 1, 26), 'category': 'NATIONAL', 'description': 'Celebration of the Constitution of India.'},
            {'name': 'Independence Day', 'date': date(2026, 8, 15), 'category': 'NATIONAL', 'description': 'Commemorating India\'s independence from British rule.'},
            {'name': 'Gandhi Jayanti', 'date': date(2026, 10, 2), 'category': 'NATIONAL', 'description': 'Birthday of Mahatma Gandhi.'},
            
            # Festivals
            {'name': 'Makar Sankranti / Pongal', 'date': date(2026, 1, 14), 'category': 'FESTIVAL', 'description': 'Harvest festival celebrated across India.'},
            {'name': 'Maha Shivratri', 'date': date(2026, 2, 16), 'category': 'FESTIVAL', 'description': 'Hindu festival in honor of Lord Shiva.'},
            {'name': 'Holi (Dhulandi)', 'date': date(2026, 3, 4), 'category': 'FESTIVAL', 'description': 'Festival of colors.'},
            {'name': 'Eid ul-Fitr', 'date': date(2026, 3, 20), 'category': 'FESTIVAL', 'description': 'Islamic festival marking the end of Ramadan.'},
            {'name': 'Ram Navami', 'date': date(2026, 3, 28), 'category': 'FESTIVAL', 'description': 'Birth of Lord Rama.'},
            {'name': 'Mahavir Jayanti', 'date': date(2026, 3, 31), 'category': 'FESTIVAL', 'description': 'Birth of Lord Mahavira.'},
            {'name': 'Good Friday', 'date': date(2026, 4, 3), 'category': 'FESTIVAL', 'description': 'Christian observance of the Crucifixion of Jesus.'},
            {'name': 'Ambedkar Jayanti', 'date': date(2026, 4, 14), 'category': 'FESTIVAL', 'description': 'Birthday of B.R. Ambedkar.'},
            {'name': 'Buddha Purnima', 'date': date(2026, 5, 2), 'category': 'FESTIVAL', 'description': 'Birth of Gautama Buddha.'},
            {'name': 'Eid al-Adha', 'date': date(2026, 5, 27), 'category': 'FESTIVAL', 'description': 'Islamic Festival of Sacrifice.'},
            {'name': 'Muharram', 'date': date(2026, 6, 26), 'category': 'FESTIVAL', 'description': 'Islamic New Year.'},
            {'name': 'Independence Day', 'date': date(2026, 8, 15), 'category': 'FESTIVAL', 'description': 'National Holiday.'},
            {'name': 'Raksha Bandhan', 'date': date(2026, 8, 28), 'category': 'FESTIVAL', 'description': 'Celebrating the bond between brothers and sisters.'},
            {'name': 'Janmashtami', 'date': date(2026, 9, 4), 'category': 'FESTIVAL', 'description': 'Birth of Lord Krishna.'},
            {'name': 'Eid-e-Milad', 'date': date(2026, 9, 25), 'category': 'FESTIVAL', 'description': 'Birthday of Prophet Muhammad.'},
            {'name': 'Dussehra', 'date': date(2026, 10, 20), 'category': 'FESTIVAL', 'description': 'Victory of Good over Evil.'},
            {'name': 'Diwali (Deepavali)', 'date': date(2026, 11, 8), 'category': 'FESTIVAL', 'description': 'Festival of Lights.'},
            {'name': 'Guru Nanak Jayanti', 'date': date(2026, 11, 24), 'category': 'FESTIVAL', 'description': 'Birth of Guru Nanak.'},
            {'name': 'Christmas Day', 'date': date(2026, 12, 25), 'category': 'FESTIVAL', 'description': 'Birth of Jesus Christ.'},
            
            # Company Holidays (Dummies)
            {'name': 'HireFlow Annual Day', 'date': date(2026, 7, 10), 'category': 'COMPANY', 'description': 'Foundation day of the company.'},
            {'name': 'Wellness Retreat Day', 'date': date(2026, 11, 20), 'category': 'COMPANY', 'description': 'Annual company wellness retreat.'},
        ]

        self.stdout.write(self.style.SUCCESS('Starting Holiday Seeding...'))
        
        created_count = 0
        updated_count = 0

        for h in holidays_data:
            obj, created = Holiday.objects.update_or_create(
                date=h['date'],
                defaults={
                    'name': h['name'],
                    'category': h['category'],
                    'description': h['description']
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded holidays! Created: {created_count}, Updated: {updated_count}'))
