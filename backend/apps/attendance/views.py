from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCEOOrSalesHead
from apps.accounts.serializers import UserProfileSerializer

from .access import attendance_for_user, visible_users_for_attendance
from .metrics import get_attendance_metrics
from .models import Attendance
from .permissions import CanAccessAttendance
from .serializers import AttendanceSerializer, GPSInputSerializer
from .services import punch_in, punch_out


class PunchInView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request):
        serializer = GPSInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = punch_in(
            request.user,
            float(serializer.validated_data["latitude"]),
            float(serializer.validated_data["longitude"]),
        )
        return Response(
            {
                "message": "Punch in successful",
                "punch_in_time": record.punch_in_time,
            },
            status=status.HTTP_201_CREATED,
        )


class PunchOutView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request):
        serializer = GPSInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = punch_out(
            request.user,
            float(serializer.validated_data["latitude"]),
            float(serializer.validated_data["longitude"]),
        )
        return Response(
            {
                "message": "Punch out successful",
                "working_hours": record.working_hours,
            },
            status=status.HTTP_200_OK,
        )


class AttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        return Response(get_attendance_metrics(request.user))


class VisibleAttendanceUsersView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, IsCEOOrSalesHead]

    def get(self, request):
        users = visible_users_for_attendance(request.user).order_by(
            "first_name",
            "last_name",
            "username",
        )
        return Response(UserProfileSerializer(users, many=True).data)


class MyAttendanceListView(generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticatedCRMUser]
    filter_backends = [OrderingFilter]
    ordering_fields = ["attendance_date", "punch_in_time", "punch_out_time"]
    ordering = ["-attendance_date"]

    def get_queryset(self):
        return Attendance.objects.filter(user=self.request.user).select_related("user")


class AttendanceListView(generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessAttendance]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        "attendance_date": ["exact", "gte", "lte"],
        "user": ["exact"],
        "user__role": ["exact"],
    }
    ordering_fields = ["attendance_date", "punch_in_time", "working_hours"]
    ordering = ["-attendance_date", "-punch_in_time"]

    def get_queryset(self):
        queryset = attendance_for_user(self.request.user)
        today = timezone.localdate()
        status_filter = self.request.query_params.get("status", "").lower()
        if status_filter == "present":
            queryset = queryset.filter(
                punch_in_time__isnull=False,
                punch_out_time__isnull=False,
            )
        elif status_filter == "in_progress":
            queryset = queryset.filter(
                punch_in_time__isnull=False,
                punch_out_time__isnull=True,
                attendance_date=today,
            )
        elif status_filter == "incomplete":
            queryset = queryset.filter(
                punch_in_time__isnull=False,
                punch_out_time__isnull=True,
                attendance_date__lt=today,
            )
        elif status_filter == "absent":
            queryset = queryset.filter(punch_in_time__isnull=True)
        return queryset
