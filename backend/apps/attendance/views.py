from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCEOOrSalesHead
from apps.accounts.serializers import UserProfileSerializer

from .access import (
    attendance_for_user,
    corrections_for_user,
    user_can_access_attendance,
    user_can_access_correction,
    visible_users_for_attendance,
)
from .correction_services import approve_correction_request, reject_correction_request
from .metrics import get_attendance_metrics
from .models import Attendance, AttendanceActivity, AttendanceCorrectionRequest
from .permissions import CanAccessAttendance, CanAccessCorrection
from .serializers import (
    AttendanceActivitySerializer,
    AttendanceCorrectionCreateSerializer,
    AttendanceCorrectionRequestSerializer,
    AttendanceSerializer,
    GPSInputSerializer,
    RejectCorrectionSerializer,
)
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


class AttendanceActivityListView(generics.ListAPIView):
    serializer_class = AttendanceActivitySerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessAttendance]

    def get_queryset(self):
        attendance_id = self.kwargs["attendance_id"]
        try:
            attendance = Attendance.objects.select_related("user").get(pk=attendance_id)
        except Attendance.DoesNotExist:
            return AttendanceActivity.objects.none()
        if not user_can_access_attendance(self.request.user, attendance):
            raise PermissionDenied("You do not have permission to view this timeline.")
        return AttendanceActivity.objects.filter(attendance_id=attendance_id).select_related(
            "user",
        )


class CorrectionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessCorrection]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AttendanceCorrectionCreateSerializer
        return AttendanceCorrectionRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        correction = serializer.save()
        output = AttendanceCorrectionRequestSerializer(
            correction,
            context={"request": request},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = corrections_for_user(self.request.user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return queryset


class CorrectionDetailView(generics.RetrieveAPIView):
    serializer_class = AttendanceCorrectionRequestSerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessCorrection]

    def get_queryset(self):
        return corrections_for_user(self.request.user)


class CorrectionApproveView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessCorrection]

    def post(self, request, pk):
        try:
            correction = corrections_for_user(request.user).get(pk=pk)
        except AttendanceCorrectionRequest.DoesNotExist as exc:
            raise PermissionDenied("Correction request not found.") from exc

        if not user_can_access_correction(request.user, correction):
            raise PermissionDenied("You do not have permission to access this request.")

        correction = approve_correction_request(correction, request.user)
        return Response(
            AttendanceCorrectionRequestSerializer(
                correction,
                context={"request": request},
            ).data,
        )


class CorrectionRejectView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessCorrection]

    def post(self, request, pk):
        try:
            correction = corrections_for_user(request.user).get(pk=pk)
        except AttendanceCorrectionRequest.DoesNotExist as exc:
            raise PermissionDenied("Correction request not found.") from exc

        if not user_can_access_correction(request.user, correction):
            raise PermissionDenied("You do not have permission to access this request.")

        serializer = RejectCorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        correction = reject_correction_request(
            correction,
            request.user,
            serializer.validated_data.get("rejection_reason", ""),
        )
        return Response(
            AttendanceCorrectionRequestSerializer(
                correction,
                context={"request": request},
            ).data,
        )
