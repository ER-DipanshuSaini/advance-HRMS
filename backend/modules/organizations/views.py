from rest_framework import viewsets
from .models import Department, Designation
from .serializers import DepartmentSerializer, DesignationSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().prefetch_related('designations')
    serializer_class = DepartmentSerializer

class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
