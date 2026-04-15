from rest_framework import viewsets
from .models import JobPosition
from .serializers import JobPositionSerializer

class JobPositionViewSet(viewsets.ModelViewSet):
    queryset = JobPosition.objects.all()
    serializer_class = JobPositionSerializer
    
    def get_queryset(self):
        queryset = JobPosition.objects.all()
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status.upper())
        return queryset
