from core.permissions import ActionPermission
from django.db.models import Count
from rest_framework import viewsets
from .models import Department, Designation
from .serializers import DepartmentSerializer, DesignationSerializer, departments_with_details

class DepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [ActionPermission]
    action_permissions = {'list': 'depts:view', 'retrieve': 'depts:view', 'create': 'depts:add', 'update': 'depts:update', 'partial_update': 'depts:update'}
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']
    queryset = departments_with_details()
    serializer_class = DepartmentSerializer

class DesignationViewSet(viewsets.ModelViewSet):
    permission_classes = [ActionPermission]
    action_permissions = {'list': 'desig:view', 'retrieve': 'desig:view', 'create': 'desig:add', 'update': 'desig:update', 'partial_update': 'desig:update'}
    queryset = Designation.objects.annotate(employee_total=Count('user'))
    serializer_class = DesignationSerializer
