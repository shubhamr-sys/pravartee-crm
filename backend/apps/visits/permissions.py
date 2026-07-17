from rest_framework import permissions

from apps.visits.access import user_can_access_visit


class CanAccessVisit(permissions.BasePermission):
    message = "You do not have permission to access this visit."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_access_visit(request.user, obj)
