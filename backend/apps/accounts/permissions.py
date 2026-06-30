"""
DRF permission classes for Pravartee CRM role-based access control.
"""
from rest_framework import permissions

from apps.accounts.access import user_can_access_lead, user_sees_all_leads
from apps.accounts.choices import UserRole


class IsAuthenticatedCRMUser(permissions.BasePermission):
    """All CRM API endpoints require an authenticated user."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)


class IsCEO(permissions.BasePermission):
    """Allow only CEO role."""

    message = "This action requires CEO privileges."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_ceo,
        )


class IsCommercial(permissions.BasePermission):
    """Allow only Commercial (pricing team) role."""

    message = "This action requires Commercial privileges."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_commercial", False),
        )


class IsCEOOrSalesHead(permissions.BasePermission):
    """Allow only CEO or Sales Head roles."""

    message = "This action requires CEO or Sales Head privileges."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and user_sees_all_leads(request.user),
        )


class CanAccessLead(permissions.BasePermission):
    """
    List/create: authenticated users (queryset scoping handles list visibility).
    Object actions: CEO sees all; Sales Head sees non-CEO-owned leads;
    Salesperson only assigned leads.
    """

    message = "You do not have permission to access this lead."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_access_lead(request.user, obj)


class CanAccessLeadActivity(permissions.BasePermission):
    """
    Activity access follows lead visibility rules.
    """

    message = "You do not have permission to access this activity."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_access_lead(request.user, obj.lead)
