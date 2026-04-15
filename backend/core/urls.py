from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

# Import ViewSets from modules
from modules.roles.views import RoleViewSet, PermissionViewSet
from modules.organizations.views import DepartmentViewSet, DesignationViewSet
from modules.users.views import LoginView, UserViewSet
from modules.attendance.views import AttendanceViewSet, HolidayViewSet, LeaveViewSet
from modules.recruitment.views import JobPositionViewSet

# Unified Router
router = DefaultRouter()

# Roles
router.register(r'security/roles', RoleViewSet, basename='role')
router.register(r'security/permissions', PermissionViewSet, basename='permission')

# Organizations
router.register(r'org/departments', DepartmentViewSet, basename='department')
router.register(r'org/designations', DesignationViewSet, basename='designation')

# Employees
router.register(r'iam/employees', UserViewSet, basename='employee')

# Attendance
router.register(r'attendance/records', AttendanceViewSet, basename='attendance')
router.register(r'attendance/holidays', HolidayViewSet, basename='holiday')
router.register(r'attendance/leaves', LeaveViewSet, basename='leave')

# Recruitment
router.register(r'recruitment/positions', JobPositionViewSet, basename='job-position')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Unified API Module
    path('api/v1/', include(router.urls)),
    
    # Communication Module
    path('api/v1/communication/', include('modules.communication_hub.urls')),
    
    # Auth is a special non-router path
    path('api/v1/iam/auth/login/', LoginView.as_view(), name='api-login'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

