from core.permissions import ActionPermission, has_capability
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import OuterRef, Prefetch, Subquery
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from modules.candidate_etl.models import CandidateProfile
from modules.organizations.serializers import departments_with_details
from modules.users.serializers import EmployeeCreateSerializer
from modules.roles.models import Role
from .models import ApplicationStageChange, JobApplication, JobPosition, Offer
from .serializers import InterviewSerializer, JobApplicationSerializer, JobPositionSerializer, OfferSerializer

class JobPositionViewSet(viewsets.ModelViewSet):
    permission_classes = [ActionPermission]
    action_permissions = {
        'list': 'recruitment:view', 'retrieve': 'recruitment:view',
        'create': 'recruitment:add', 'update': 'recruitment:update',
        'partial_update': 'recruitment:update', 'applications': 'recruitment:view',
        'shortlist': 'recruitment:update', 'move_stage': 'recruitment:update',
        'matches': 'recruitment:view', 'history': 'recruitment:view', 'onboard': 'users:add',
        'interviews': 'recruitment:view', 'scorecard': 'recruitment:update',
        'offer': 'recruitment:view', 'interviewers': 'recruitment:update',
    }
    queryset = JobPosition.objects.all()
    serializer_class = JobPositionSerializer
    lookup_field = 'job_id'
    
    def get_queryset(self):
        latest = JobApplication.objects.filter(job_position=OuterRef('pk')).order_by('-updated_at', '-pk')
        queryset = self.queryset.annotate(
            latest_stage=Subquery(latest.values('current_stage')[:1]),
        )
        if self.action in {'list', 'retrieve', 'update', 'partial_update'}:
            queryset = queryset.prefetch_related(Prefetch('department', queryset=departments_with_details()))
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status.upper())
        return queryset

    def get_object(self):
        identifier = self.kwargs['job_id']
        lookup = {'pk': identifier} if identifier.isdecimal() else {'job_id': identifier}
        position = get_object_or_404(self.filter_queryset(self.get_queryset()), **lookup)
        self.check_object_permissions(self.request, position)
        return position

    @action(detail=True)
    def applications(self, request, **kwargs):
        rows = self.get_object().applications.select_related('candidate')
        return Response(JobApplicationSerializer(rows, many=True).data)

    @action(detail=True)
    def matches(self, request, **kwargs):
        position = self.get_object()
        required = {word.strip().casefold() for word in position.requirements.split(',') if word.strip()}
        if not required:
            return Response([])
        candidates = CandidateProfile.objects.exclude(job_applications__job_position=position)
        matches = []
        for candidate in candidates.only('name', 'skills').iterator():
            skills = {skill.strip().casefold() for skill in candidate.skills.split(',')}
            overlap = sorted(required & skills)
            if overlap:
                matches.append({
                    'id': candidate.pk, 'name': candidate.name,
                    'score': round(100 * len(overlap) / len(required)),
                    'matched_skills': overlap,
                })
        return Response(sorted(matches, key=lambda row: (-row['score'], row['id']))[:50])

    @action(detail=True, url_path=r'applications/(?P<application_id>[0-9]+)/history')
    def history(self, request, application_id, **kwargs):
        application = get_object_or_404(self.get_object().applications, pk=application_id)
        return Response(list(application.stage_changes.order_by('-created_at').values(
            'previous_stage', 'new_stage', 'actor_id', 'created_at',
        )))

    @action(detail=True, methods=['get', 'post'], url_path=r'applications/(?P<application_id>[0-9]+)/interviews')
    def interviews(self, request, application_id, **kwargs):
        application = get_object_or_404(self.get_object().applications, pk=application_id)
        if request.method == 'GET':
            interviews = application.interviews.select_related('interviewer').order_by('scheduled_at')
            return Response(InterviewSerializer(interviews, many=True).data)
        if not has_capability(request.user, 'recruitment:update'):
            raise PermissionDenied()
        serializer = InterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(application=application)
        return Response(serializer.data, status=201)

    @action(detail=False)
    def interviewers(self, request):
        employees = get_user_model().objects.filter(is_active=True, status='ACTIVE').order_by('first_name', 'last_name')
        return Response([
            {'id': employee.pk, 'name': employee.get_full_name() or employee.email}
            for employee in employees
        ])

    @action(
        detail=True, methods=['patch'],
        url_path=r'applications/(?P<application_id>[0-9]+)/interviews/(?P<interview_id>[0-9]+)/scorecard',
    )
    def scorecard(self, request, application_id, interview_id, **kwargs):
        application = get_object_or_404(self.get_object().applications, pk=application_id)
        interview = get_object_or_404(application.interviews, pk=interview_id)
        if interview.interviewer_id != request.user.pk and not request.user.is_superuser:
            raise PermissionDenied('Only the assigned interviewer can submit the scorecard.')
        fields = {'technical_score', 'communication_score', 'feedback'}
        serializer = InterviewSerializer(
            interview, data={key: request.data[key] for key in fields if key in request.data}, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'put'], url_path=r'applications/(?P<application_id>[0-9]+)/offer')
    @transaction.atomic
    def offer(self, request, application_id, **kwargs):
        application = get_object_or_404(self.get_object().applications.select_for_update(), pk=application_id)
        offer = Offer.objects.filter(application=application).first()
        if request.method == 'GET':
            return Response(OfferSerializer(offer).data if offer else None)
        if not has_capability(request.user, 'recruitment:update'):
            raise PermissionDenied()
        serializer = OfferSerializer(offer, data=request.data, partial=bool(offer))
        serializer.is_valid(raise_exception=True)
        serializer.save(application=application)
        return Response(serializer.data, status=200 if offer else 201)

    @action(detail=True, methods=['post'])
    def shortlist(self, request, **kwargs):
        position = self.get_object()
        try:
            candidate_id = int(request.data.get('candidate'))
        except (TypeError, ValueError):
            raise ValidationError({'candidate': 'A candidate ID is required.'})
        candidate = get_object_or_404(CandidateProfile, pk=candidate_id)
        application, _ = position.applications.get_or_create(candidate=candidate)
        return Response(JobApplicationSerializer(application).data)

    @action(detail=True, methods=['patch'], url_path=r'applications/(?P<application_id>[0-9]+)/stage')
    @transaction.atomic
    def move_stage(self, request, application_id, **kwargs):
        application = get_object_or_404(self.get_object().applications.select_for_update(), pk=application_id)
        previous_stage = application.current_stage
        serializer = JobApplicationSerializer(application, data={
            'current_stage': request.data.get('current_stage'),
        }, partial=True)
        serializer.is_valid(raise_exception=True)
        new_stage = serializer.validated_data['current_stage']
        if new_stage == previous_stage:
            return Response(serializer.data)
        if application.employee_id:
            raise ValidationError('An onboarded application cannot change stage.')
        serializer.save()
        ApplicationStageChange.objects.create(
            application=application, actor=request.user,
            previous_stage=previous_stage, new_stage=new_stage,
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path=r'applications/(?P<application_id>[0-9]+)/onboard')
    @transaction.atomic
    def onboard(self, request, application_id, **kwargs):
        position = self.get_object()
        application = get_object_or_404(position.applications.select_for_update(), pk=application_id)
        if application.employee_id:
            return Response({'employee': application.employee_id})
        if application.current_stage != 'HIRED':
            raise ValidationError('Only hired candidates can be onboarded.')
        offer = Offer.objects.filter(application=application).first()
        if offer and offer.status != Offer.Status.ACCEPTED:
            raise ValidationError('Accept the recorded offer before onboarding.')
        candidate = application.candidate
        if get_user_model().objects.filter(email__iexact=candidate.email).exists():
            raise ValidationError('An employee with this email already exists.')
        names = candidate.name.strip().split(maxsplit=1)
        serializer = EmployeeCreateSerializer(data={
            'email': candidate.email, 'first_name': names[0] if names else '',
            'last_name': names[1] if len(names) > 1 else '',
            'department': position.department_id,
            'role': Role.objects.filter(name='Employee').values_list('pk', flat=True).first(),
            **({'date_of_joining': offer.start_date} if offer else {}),
        })
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                employee = serializer.save()
        except IntegrityError:
            raise ValidationError('Employee creation conflicted with another request. Refresh and retry.')
        application.employee = employee
        application.save(update_fields=['employee', 'updated_at'])
        return Response({'employee': employee.pk, 'generated_password': employee.plain_password}, status=201)
