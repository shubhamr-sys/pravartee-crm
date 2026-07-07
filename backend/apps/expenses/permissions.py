from rest_framework import permissions

from apps.expenses.access import user_can_access_expense, user_can_review_expense


class CanAccessExpense(permissions.BasePermission):
    message = "You do not have permission to access this expense."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_access_expense(request.user, obj)


class CanReviewExpense(permissions.BasePermission):
    message = "You do not have permission to review this expense."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return user_can_review_expense(request.user, obj)
