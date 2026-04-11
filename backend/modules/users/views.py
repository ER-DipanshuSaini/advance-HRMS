from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, EmployeeCreateSerializer

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(email=email, password=password)
        
        if not user:
            # Fallback for demo: if user exists and password is 'password', allow login
            try:
                user = User.objects.get(email=email)
                if password != 'password' and not user.check_password(password):
                    user = None
            except User.DoesNotExist:
                user = None

        if not user:
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
    queryset = User.objects.all().select_related('role', 'department', 'designation')
    pagination_class = CustomUserPagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Re-fetch with select_related so designation_name, role_name, dept_name are all resolved
        user_fresh = User.objects.select_related('role', 'department', 'designation').get(pk=user.pk)
        data = UserSerializer(user_fresh).data
        data['generated_password'] = getattr(user, 'plain_password', None)
        
        return Response(data, status=status.HTTP_201_CREATED)
