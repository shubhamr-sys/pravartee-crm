from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedCRMUser
from apps.visits.access import visits_for_user
from apps.visits.models import FieldVisit
from apps.visits.permissions import CanAccessVisit
from apps.visits.serializers import (
    FieldVisitSerializer,
    VisitCheckInSerializer,
    VisitCheckOutSerializer,
)
from apps.visits.services import check_in, check_out, get_active_visit


class VisitCheckInView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request):
        if getattr(request.user, "is_commercial", False):
            return Response(
                {"detail": "Commercial users cannot record field visits."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = VisitCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = check_in(
            request.user,
            department_name=serializer.validated_data["department_name"],
            latitude=float(serializer.validated_data["latitude"]),
            longitude=float(serializer.validated_data["longitude"]),
            purpose=serializer.validated_data.get("purpose", ""),
            contact_person=serializer.validated_data["contact_person"],
            mobile=serializer.validated_data["mobile"],
            designation=serializer.validated_data.get("designation", ""),
        )
        return Response(
            {
                "message": "Checked in successfully",
                "visit": FieldVisitSerializer(visit, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class VisitCheckOutView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request):
        serializer = VisitCheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = check_out(
            request.user,
            latitude=float(serializer.validated_data["latitude"]),
            longitude=float(serializer.validated_data["longitude"]),
            notes=serializer.validated_data.get("notes", ""),
        )
        return Response(
            {
                "message": "Checked out successfully",
                "visit": FieldVisitSerializer(visit, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class ActiveVisitView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        visit = get_active_visit(request.user)
        if visit is None:
            return Response({"visit": None})
        return Response(
            {"visit": FieldVisitSerializer(visit, context={"request": request}).data},
        )


class MyVisitListView(generics.ListAPIView):
    serializer_class = FieldVisitSerializer
    permission_classes = [IsAuthenticatedCRMUser]
    filter_backends = [OrderingFilter]
    ordering_fields = ["check_in_time", "check_out_time", "duration_hours"]
    ordering = ["-check_in_time"]

    def get_queryset(self):
        return (
            FieldVisit.objects.filter(user=self.request.user)
            .select_related("user")
            .prefetch_related("activities", "activities__user")
        )


class VisitListView(generics.ListAPIView):
    serializer_class = FieldVisitSerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessVisit]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "status": ["exact"],
        "user": ["exact"],
    }
    search_fields = ["department_name", "purpose", "notes"]
    ordering_fields = ["check_in_time", "check_out_time", "duration_hours"]
    ordering = ["-check_in_time"]

    def get_queryset(self):
        return visits_for_user(self.request.user).prefetch_related(
            "activities",
            "activities__user",
        )
