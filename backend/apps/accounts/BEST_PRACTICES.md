# Custom User Model — Best Practices

## 1. Use `AbstractUser` for CRM + Django admin

`AbstractUser` provides password hashing, sessions, groups, and admin integration.  
CRM-specific fields (`role`, UUID, timestamps) extend it without reimplementing auth.

## 2. UUID primary key

- Defined once in `apps.core.models.TimeStampedModel`
- Safe for APIs and future service extraction
- Set `editable=False` and `default=uuid.uuid4`

## 3. Roles as `TextChoices`

- Store stable codes (`CEO`, `SALES_HEAD`, `SALESPERSON`) in the database
- Display labels in admin and UI via `.label`
- Enforce authorization in **permissions / querysets**, not only in templates

```python
if request.user.has_crm_role(UserRole.CEO, UserRole.SALES_HEAD):
    ...
```

## 4. `AUTH_USER_MODEL`

```python
# config/settings/base.py
AUTH_USER_MODEL = "accounts.User"
```

Always reference:

```python
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()
```

## 5. Custom manager

`CRMUserManager` ensures:

- `create_user` → default role `SALESPERSON`
- `create_superuser` → default role `CEO`, `is_staff=True`
- Email is required and normalized

## 6. Soft deactivation

Use `is_active=False` instead of deleting users who own leads or activities.

## 7. API exposure

`UserSerializer` exposes only CRM fields — never expose `password`, `is_superuser`, or raw permissions unless required.

## 8. Indexes

- `email` (unique lookups)
- `(role, is_active)` (dashboard and team filters)

## 9. Testing

Use `get_user_model()` in tests and `User.objects.create_user(...)` with explicit `role`.

## 10. What not to do

- Do not use `django.contrib.auth.models.User`
- Do not circular-import `User` in `accounts.models` from other apps at module level
- Do not change `AUTH_USER_MODEL` after go-live
- Do not store permissions only in `role` without Django permissions for admin actions

## Next steps (Week 3+)

- `apps.accounts.permissions` — DRF permission classes per role
- Queryset scoping on leads (salesperson sees own; head sees team; CEO sees all)
- Optional: `USERNAME_FIELD = "email"` if email-login is required (breaking change)
