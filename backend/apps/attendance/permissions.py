from rest_framework import permissions

from apps.attendance.access import user_can_access_attendance, user_can_access_correction


class CanAccessAttendance(permissions.BasePermission):
    message = "You do not have permission to access this attendance record."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_access_attendance(request.user, obj)


class CanAccessCorrection(permissions.BasePermission):
    message = "You do not have permission to access this correction request."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_access_correction(request.user, obj)
