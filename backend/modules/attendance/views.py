from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Avg, Sum, Count
from decimal import Decimal
import datetime

from .models import AttendanceRecord, Holiday, LeaveRequest
from .serializers import AttendanceRecordSerializer, HolidaySerializer, LeaveRequestSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        
        target_user_id = self.request.query_params.get('user_id')
        
        if target_user_id and 'attendance:view_all' in perms:
            qs = AttendanceRecord.objects.filter(user_id=target_user_id)
        elif 'attendance:view_own' in perms:
            qs = AttendanceRecord.objects.filter(user=user)
        else:
            return AttendanceRecord.objects.none()

        # Optional date range or month/year filter via query params
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if year:
            qs = qs.filter(date__year=year)
        if month:
            qs = qs.filter(date__month=month)

        return qs.order_by('-date')

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        user = request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        target_user_id = request.query_params.get('user_id')
        
        if target_user_id and 'attendance:view_all' in perms:
            q_user_id = target_user_id
        elif 'attendance:view_own' in perms:
            q_user_id = user.id
        else:
            return Response(None, status=status.HTTP_403_FORBIDDEN)

        today = timezone.localdate()
        try:
            record = AttendanceRecord.objects.get(user_id=q_user_id, date=today)
            serializer = self.get_serializer(record)
            return Response(serializer.data)
        except AttendanceRecord.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        user = request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        target_user_id = request.data.get('user_id')
        
        if target_user_id and 'attendance:add_all' in perms:
            q_user_id = target_user_id
        elif 'attendance:mark_own' in perms:
            q_user_id = user.id
        else:
            return Response({'detail': 'No permission to check in.'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        record, created = AttendanceRecord.objects.get_or_create(
            user_id=q_user_id,
            date=today,
            defaults={'check_in': now_time, 'status': 'PRESENT'}
        )

        if not created and record.check_in:
            return Response({'detail': 'Already checked in today.'}, status=status.HTTP_400_BAD_REQUEST)

        if not created:
            record.check_in = now_time
            record.status = 'PRESENT'
            record.save()

        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        user = request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        target_user_id = request.data.get('user_id')
        
        if target_user_id and 'attendance:add_all' in perms:
            q_user_id = target_user_id
        elif 'attendance:mark_own' in perms:
            q_user_id = user.id
        else:
            return Response({'detail': 'No permission to check out.'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        try:
            record = AttendanceRecord.objects.get(user_id=q_user_id, date=today)
        except AttendanceRecord.DoesNotExist:
            return Response({'detail': 'No check-in found for today. Please check in first.'}, status=status.HTTP_400_BAD_REQUEST)

        if not record.check_in:
            return Response({'detail': 'Please check in before checking out.'}, status=status.HTTP_400_BAD_REQUEST)

        if record.check_out:
            return Response({'detail': 'You have already checked out today.'}, status=status.HTTP_400_BAD_REQUEST)

        record.check_out = now_time
        record.calculate_work_hours()
        record.save()

        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        user = request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        target_user_id = request.query_params.get('user_id')
        
        if target_user_id and 'attendance:view_all' in perms:
            q_user_id = target_user_id
        elif 'attendance:view_own' in perms:
            q_user_id = user.id
        else:
            return Response({'detail': 'No permission.'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.localdate()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))

        records = AttendanceRecord.objects.filter(
            user_id=q_user_id,
            date__year=year,
            date__month=month
        )

        present_count = records.filter(status__in=['PRESENT', 'HALF_DAY']).count()
        total_hours = records.aggregate(total=Sum('work_hours'))['total'] or Decimal('0')
        avg_hours = records.filter(work_hours__isnull=False).aggregate(avg=Avg('work_hours'))['avg']
        total_days = records.count()

        return Response({
            'month': month,
            'year': year,
            'present_days': present_count,
            'total_days_recorded': total_days,
            'total_hours': float(round(total_hours, 2)),
            'average_hours': float(round(avg_hours, 2)) if avg_hours else 0,
        })


class HolidayViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows holidays to be viewed and managed securely based on RBAC.
    """
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Holiday.objects.all()
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        upcoming = self.request.query_params.get('upcoming')
        
        if upcoming:
            # Return holidays for next 30 days
            today = timezone.localdate()
            qs = qs.filter(date__gte=today).order_by('date')[:5]
            return qs

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if year:
            qs = qs.filter(date__year=year)
        if month:
            qs = qs.filter(date__month=month)
            
        return qs.order_by('date')

    def create(self, request, *args, **kwargs):
        perms = request.user.role.permissions.values_list('code', flat=True) if request.user.role else []
        if 'holidays:add' not in perms:
            return Response({"detail": "No permission to add holidays."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        perms = request.user.role.permissions.values_list('code', flat=True) if request.user.role else []
        if 'holidays:update' not in perms:
            return Response({"detail": "No permission to update holidays."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        perms = request.user.role.permissions.values_list('code', flat=True) if request.user.role else []
        if 'holidays:update' not in perms:
            return Response({"detail": "No permission to update holidays."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        perms = request.user.role.permissions.values_list('code', flat=True) if request.user.role else []
        if 'holidays:update' not in perms:
            return Response({"detail": "No permission to delete holidays."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class LeaveViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.all()
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        if 'leaves:view_all' not in perms and 'attendance:view_all' not in perms:
            if 'leaves:view_own' in perms or 'attendance:view_own' in perms:
                qs = qs.filter(user=user)
            else:
                qs = LeaveRequest.objects.none()
        return qs

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        user = request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        data = request.data.copy()
        
        target_user_id = data.get('user_id')
        if target_user_id and str(target_user_id) != str(user.id):
            if 'leaves:add_all' not in perms:
                return Response({"detail": "No permission to add employee leaves."}, status=status.HTTP_403_FORBIDDEN)
            data['user'] = target_user_id
        else:
            if 'leaves:apply_own' not in perms:
                return Response({"detail": "No permission to apply for your own leaves."}, status=status.HTTP_403_FORBIDDEN)
            data['user'] = user.id

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            leave_type = serializer.validated_data['leave_type']
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            
            requested_days = (end_date - start_date).days + 1
            if requested_days <= 0:
                return Response({"detail": "End date must be after or on start date."}, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                target_user_obj = user.__class__.objects.get(id=data['user'])
                balances = self._get_balance_dict(target_user_obj)
                available = balances.get(leave_type, {}).get('balance', 0)
                
                if requested_days > available:
                    return Response(
                        {"detail": f"Insufficient {leave_type} balance. Requested: {requested_days}, Available: {available}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                return Response({"detail": f"Error verifying balance: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # user is in read_only_fields so we pass it explicitly on save
            serializer.save(user_id=data['user'])
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        user = request.user
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        
        if 'leaves:review_all' not in perms:
            return Response({"detail": "No permission to review leaves."}, status=status.HTTP_403_FORBIDDEN)
            
        leave_request = self.get_object()
        new_status = request.data.get('status')
        comment = request.data.get('comment', '')
        
        if new_status not in ['APPROVED', 'REJECTED', 'CANCELLED']:
            return Response({"detail": "Invalid status parameter."}, status=status.HTTP_400_BAD_REQUEST)
            
        leave_request.status = new_status
        leave_request.reviewer = user
        leave_request.reviewer_comment = comment
        leave_request.reviewed_at = timezone.now()
        leave_request.save()
        
        serializer = self.get_serializer(leave_request)
        return Response(serializer.data)

    def _get_balance_dict(self, target_user):
        import datetime
        today = timezone.localdate()
        doj = target_user.date_of_joining if hasattr(target_user, 'date_of_joining') and target_user.date_of_joining else today
        current_year_start = datetime.date(today.year, 1, 1)

        # SL/CL calculation logic for current year
        accrual_start_this_year = max(doj, current_year_start)
        months_this_year = (today.year - accrual_start_this_year.year) * 12 + today.month - accrual_start_this_year.month + 1

        sl_accrued = min(months_this_year * 0.5, 6.0)
        cl_accrued = min(months_this_year * 0.5, 6.0)

        # PL calculation from DOJ
        total_months = (today.year - doj.year) * 12 + today.month - doj.month + 1
        pl_accrued = total_months * 1.0

        # Used leaves (we subtract immediately on PENDING or APPROVED)
        leaves_this_year = LeaveRequest.objects.filter(
            user=target_user,
            status__in=['PENDING', 'APPROVED'],
            start_date__year=today.year
        )
        
        sl_used = sum(req.total_days for req in leaves_this_year if req.leave_type == 'SL')
        cl_used = sum(req.total_days for req in leaves_this_year if req.leave_type == 'CL')

        all_pl_leaves = LeaveRequest.objects.filter(
            user=target_user,
            status__in=['PENDING', 'APPROVED'],
            leave_type='PL'
        )
        pl_used = sum(req.total_days for req in all_pl_leaves)

        return {
            'SL': {'accrued': float(sl_accrued), 'used': float(sl_used), 'balance': float(sl_accrued) - float(sl_used)},
            'CL': {'accrued': float(cl_accrued), 'used': float(cl_used), 'balance': float(cl_accrued) - float(cl_used)},
            'PL': {'accrued': float(pl_accrued), 'used': float(pl_used), 'balance': float(pl_accrued) - float(pl_used)},
        }

    @action(detail=False, methods=['get'], url_path='balance')
    def balance(self, request):
        user = request.user
        target_user_id = request.query_params.get('user_id')
        perms = user.role.permissions.values_list('code', flat=True) if user.role else []
        
        if target_user_id and 'attendance:view_all' in perms:
            target_user = user.__class__.objects.get(id=target_user_id)
        else:
            target_user = user

        return Response(self._get_balance_dict(target_user))
