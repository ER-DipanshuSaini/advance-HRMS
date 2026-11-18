from unittest.mock import patch
from datetime import timedelta
from io import BytesIO
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from modules.candidate_etl.models import CandidateProfile
from modules.candidate_etl.tasks import process_attachment
from modules.communication_hub.models import MailAccount, MailAttachment, MailMessage
from modules.organizations.models import Department
from modules.recruitment.models import ApplicationStageChange, JobPosition
from modules.roles.models import Permission, Role


class WorkflowTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            email='employee@example.com', password='Actual-Secret-2345',
        )
        self.admin = get_user_model().objects.create_superuser(
            email='admin@example.com', password='Actual-Secret-Base',
        )

    def test_demo_password_does_not_authenticate(self):
        response = self.client.post('/api/v1/iam/auth/login/', {
            'email': self.user.email, 'password': 'password',
        })
        self.assertEqual(response.status_code, 401)

    def test_employee_and_role_routes_are_restricted(self):
        path = '/api/v1/iam/employees/'
        self.assertEqual(self.client.get(path).status_code, 401)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(path).status_code, 403)
        self.assertEqual(self.client.get('/api/v1/security/roles/').status_code, 403)
        role = Role.objects.create(name='Employee')
        role.permissions.add(Permission.objects.create(
            code='profile:view', name='View own profile', module='IAM',
        ))
        self.user.role = role
        self.user.save()
        self.assertEqual(self.client.get(f'{path}{self.user.pk}/').status_code, 200)
        self.assertEqual(self.client.patch(f'{path}{self.user.pk}/', {'role': role.pk}).status_code, 403)
        self.assertEqual(self.client.get(f'{path}{self.admin.pk}/').status_code, 404)

    def test_leave_route_requires_controlled_write_action(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/v1/attendance/leaves/', {}).status_code, 405)
        self.assertEqual(self.client.post('/api/v1/attendance/leaves/apply/', {}).status_code, 403)

    def test_leave_overlap_and_review_transitions(self):
        role = Role.objects.create(name='Leave reviewer')
        for code in ('leaves:apply_own', 'leaves:view_own', 'leaves:review_all'):
            role.permissions.add(Permission.objects.create(code=code, name=code))
        self.user.role = role
        self.user.save()
        self.client.force_authenticate(self.user)
        day = timezone.localdate().isoformat()
        fields = {'leave_type': 'PL', 'start_date': day, 'end_date': day, 'reason': 'Personal'}
        path = '/api/v1/attendance/leaves/'
        result = self.client.post(path + 'apply/', fields)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(self.client.post(path + 'apply/', fields).status_code, 400)
        review = f"{path}{result.json()['id']}/review/"
        self.assertEqual(self.client.post(review, {'status': 'APPROVED'}).status_code, 200)
        self.assertEqual(self.client.post(review, {'status': 'REJECTED'}).status_code, 400)

    def test_mail_sync_enqueues_once_and_preserves_credentials(self):
        self.client.force_authenticate(self.user)
        account = MailAccount.objects.create(
            user=self.user, email_address='mail@example.com', password='mail password',
            imap_host='imap.example.com', smtp_host='smtp.example.com',
        )
        path = f'/api/v1/communication/sync/{account.pk}/'
        with patch('modules.communication_hub.tasks.full_initial_sync_task.delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.client.post(path).status_code, 202)
            self.assertEqual(self.client.post(path).status_code, 400)
        delay.assert_called_once_with(account.pk, historical=True)
        account.refresh_from_db()
        self.assertEqual(account.password, 'mail password')

    def test_docx_ingestion_is_idempotent_and_attachment_is_private(self):
        account = MailAccount.objects.create(
            user=self.user, email_address='mail@example.com', password='mail password',
            imap_host='imap.example.com', smtp_host='smtp.example.com',
        )
        message = MailMessage.objects.create(
            account=account, uid='1', sender='applicant@example.com', received_at=timezone.now(),
        )
        document = BytesIO()
        with ZipFile(document, 'w') as archive:
            archive.writestr('word/document.xml', (
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body><w:p><w:r><w:t>Casey Applicant</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>applicant@example.com 9876543210 Python</w:t></w:r></w:p>'
                '</w:body></w:document>'
            ))
        with TemporaryDirectory() as storage, override_settings(MEDIA_ROOT=storage):
            attachment = MailAttachment.objects.create(
                message=message, file=ContentFile(document.getvalue(), name='resume.docx'),
                file_name='resume.docx', file_size=len(document.getvalue()),
            )
            process_attachment(attachment.pk)
            process_attachment(attachment.pk)
            self.assertEqual(CandidateProfile.objects.filter(email='applicant@example.com').count(), 1)
            self.assertEqual(attachment.ingestion_log.status, 'SUCCESS')
            path = f'/api/v1/communication/attachment/{attachment.pk}/'
            self.client.force_authenticate(self.admin)
            self.assertEqual(self.client.get(path).status_code, 404)
            self.client.force_authenticate(self.user)
            result = self.client.get(path)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(b''.join(result.streaming_content), document.getvalue())
            result.close()

    def test_recruitment_hires_and_onboards_candidate_once(self):
        self.client.force_authenticate(self.admin)
        department = Department.objects.create(name='Engineering', dept_id='ENG')
        job = JobPosition.objects.create(
            title='Developer', department=department, location='Pune',
            min_experience=1, max_experience=3, min_salary=5, max_salary=9,
            requirements='Python, SQL',
        )
        candidate = CandidateProfile.objects.create(
            name='Casey Hire', email='casey@example.com', phone='1234567890', skills='Python',
        )
        path = f'/api/v1/recruitment/positions/{job.job_id}/'
        self.assertEqual(self.client.get(path).status_code, 200)
        self.assertEqual(self.client.get(path + 'matches/').json()[0]['score'], 50)
        response = self.client.post(path + 'shortlist/', {'candidate': candidate.pk})
        self.assertEqual(response.status_code, 200)
        application_path = f"{path}applications/{response.json()['id']}/"
        self.assertEqual(self.client.post(application_path + 'onboard/').status_code, 400)
        interview_path = application_path + 'interviews/'
        interview = self.client.post(interview_path, {
            'interviewer': self.admin.pk,
            'scheduled_at': (timezone.now() + timedelta(days=1)).isoformat(),
        })
        self.assertEqual(interview.status_code, 201)
        scorecard = f"{interview_path}{interview.json()['id']}/scorecard/"
        self.assertEqual(self.client.patch(scorecard, {'technical_score': 8}).status_code, 400)
        self.assertEqual(self.client.patch(scorecard, {'technical_score': 4}).status_code, 200)
        response = self.client.patch(application_path + 'stage/', {'current_stage': 'HIRED'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ApplicationStageChange.objects.get().new_stage, 'HIRED')
        self.assertEqual(self.client.get(application_path + 'history/').json()[0]['previous_stage'], 'SHORTLIST')
        offer_path = application_path + 'offer/'
        self.assertEqual(self.client.put(offer_path, {
            'annual_salary_lpa': '8.50', 'start_date': '2027-01-04',
        }).status_code, 201)
        self.assertEqual(self.client.post(application_path + 'onboard/').status_code, 400)
        self.assertEqual(self.client.put(offer_path, {'status': 'SENT'}).status_code, 200)
        self.assertEqual(self.client.put(offer_path, {'status': 'ACCEPTED'}).status_code, 200)
        response = self.client.post(application_path + 'onboard/')
        self.assertEqual(response.status_code, 201)
        employee = get_user_model().objects.get(email=candidate.email)
        self.assertTrue(employee.check_password(response.json()['generated_password']))
        self.assertEqual(self.client.post(application_path + 'onboard/').json(), {'employee': employee.pk})
