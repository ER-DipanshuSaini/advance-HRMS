from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, EmployeeCreateSerializer
from modules.roles.models import Role
from core.permissions import ActionPermission, has_capability
from rest_framework.exceptions import PermissionDenied
from rest_framework.throttling import AnonRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = 'login'

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(email=email, password=password)
        
        if not user or user.status != 'ACTIVE':
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        refresh = RefreshToken.for_user(user)
        
        profile_data = None
        if hasattr(user, 'profile') and user.profile:
            from .serializers import EmployeeProfileSerializer
            profile_data = EmployeeProfileSerializer(user.profile, context={'request': request}).data

        user_payload = {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "role": user.role.name if user.role else ("Super Admin" if user.is_superuser else "Employee"),
            "role_name": user.role.name if user.role else ("Super Admin" if user.is_superuser else "Employee"),
            "permissions": list(user.role.permissions.values_list('code', flat=True)) if user.role else [],
            "profile": profile_data
        }

        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'bearer',
            'user': user_payload
        }, status=status.HTTP_200_OK)

class CustomUserPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('role', 'department', 'designation', 'profile').order_by('pk')
    pagination_class = CustomUserPagination
    permission_classes = [ActionPermission]
    action_permissions = {
        'list': 'users:view', 'retrieve': ('profile:view', 'users:view'), 'create': 'users:add',
        'update': ('profile:view', 'users:view'), 'partial_update': ('profile:view', 'users:view'),
    }

    def get_queryset(self):
        user = self.request.user
        if has_capability(user, 'users:view'):
            return self.queryset
        return self.queryset.filter(pk=user.pk)

    def perform_update(self, serializer):
        user = self.request.user
        own_profile = user.pk == serializer.instance.pk
        fields = {
            'first_name': 'update_basic', 'last_name': 'update_basic',
            'profile': 'update_basic', 'email': 'update_email',
            'phone_number': 'update_phone', 'department': 'update_dept',
            'designation': 'update_desig',
        }
        for field, value in serializer.validated_data.items():
            suffix = fields.get(field)
            if suffix and field != 'profile' and value == getattr(serializer.instance, field):
                continue
            scope = 'profile' if own_profile else 'users'
            if not user.is_superuser and (
                not suffix or not has_capability(user, f'{scope}:{suffix}')
                or (own_profile and field in {'department', 'designation'})
            ):
                raise PermissionDenied(f'You cannot update {field}.')
        serializer.save()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if request.user.is_superuser:
            user = serializer.save()
        else:
            if serializer.validated_data.get('role'):
                raise PermissionDenied('Only administrators can assign roles.')
            user = serializer.save(role=Role.objects.filter(name='Employee').first())
        
        # Re-fetch with select_related so designation_name, role_name, dept_name are all resolved
        user_fresh = User.objects.select_related('role', 'department', 'designation').get(pk=user.pk)
        data = UserSerializer(user_fresh).data
        data['generated_password'] = getattr(user, 'plain_password', None)
        
        return Response(data, status=status.HTTP_201_CREATED)
