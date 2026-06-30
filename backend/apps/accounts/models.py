"""
User and authentication models for Pravartee CRM.

CRM-facing fields (API / business layer):
    id, username, email, first_name, last_name, role, is_active, created_at, updated_at

Additional fields inherited from Django auth (required for login, admin, permissions):
    password, is_staff, is_superuser, last_login, date_joined, groups, user_permissions
"""
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import TimeStampedModel

from .choices import UserRole
from .managers import CRMUserManager
from .password_reset_models import PasswordResetToken  # noqa: F401

# Re-export for convenience: from apps.accounts.models import UserRole
__all__ = ["User", "UserRole", "PasswordResetToken"]


class User(TimeStampedModel, AbstractUser):
    """
    Custom user for Pravartee CRM.

    Uses UUID primary key via TimeStampedModel. Role drives RBAC (implemented in views
    and permissions in later iterations).
    """

    # --- CRM fields (explicit overrides / additions) ---

    username = models.CharField(
        max_length=150,
        unique=True,
        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
    )
    email = models.EmailField(
        max_length=255,
        unique=True,
        help_text="Required. Used for notifications and login recovery.",
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(
        max_length=50,
        choices=UserRole.choices,
        default=UserRole.SALESPERSON,
        db_index=True,
        help_text="Determines CRM access level.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive users cannot sign in.",
    )
    password_reset_email_count = models.PositiveSmallIntegerField(
        default=0,
        help_text="Number of forgot-password emails sent (max 3 per account).",
    )
    # created_at, updated_at — from TimeStampedModel
    # id (UUID) — from TimeStampedModel

    objects = CRMUserManager()

    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["last_name", "first_name", "username"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self):
        # Prefer username in admin and foreign key displays.
        return self.username

    def get_full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.username

    # --- Role helpers (use in permissions / queryset filtering) ---

    @property
    def is_ceo(self):
        return self.role == UserRole.CEO

    @property
    def is_sales_head(self):
        return self.role == UserRole.SALES_HEAD

    @property
    def is_salesperson(self):
        return self.role == UserRole.SALESPERSON

    @property
    def is_commercial(self):
        return self.role == UserRole.COMMERCIAL

    def has_crm_role(self, *roles: str) -> bool:
        """Return True if the user's role is in the given role codes."""
        return self.role in roles
