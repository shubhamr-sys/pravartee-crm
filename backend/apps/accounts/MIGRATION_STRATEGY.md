# User Model — Migration Strategy

## Current state

- `AUTH_USER_MODEL = "accounts.User"` is set in `config/settings/base.py`
- Initial migration: `apps/accounts/migrations/0001_initial.py`
- Dependent apps use swappable dependency: `leads`, `activities`

## Rules (non-negotiable)

1. **Set `AUTH_USER_MODEL` before the first `migrate`**  
   Changing it after tables exist requires a full reset or complex data migration.

2. **Never rename the User model or app label in production**  
   Foreign keys store `accounts.User` as the target.

3. **Add fields; avoid removing columns**  
   Prefer nullable fields + deprecation over dropping columns in use.

4. **Reference users via settings, never import the model directly in migrations**

   ```python
   from django.conf import settings
   migrations.swappable_dependency(settings.AUTH_USER_MODEL)
   ```

## Fresh environment

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser   # defaults role to CEO via CRMUserManager
```

## After changing `models.py`

```bash
python manage.py makemigrations accounts
python manage.py migrate
python manage.py migrate --plan    # review before production
```

## Role field changes

If you add or rename `UserRole` values:

1. Add new choice to `UserRole` TextChoices
2. Create a data migration to map old values → new values
3. Deploy code and migration together

Example data migration skeleton:

```python
def forwards(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(role="OLD").update(role="NEW")
```

## Reset database (development only)

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS pravartee_crm;"
# Re-provision PostgreSQL (see deployment/postgresql/README.md)
python manage.py migrate
python manage.py seed_crm_data
python manage.py createsuperuser
```

## Production deploy

```bash
python manage.py migrate --no-input
```

Always back up `users` (and related FK tables) before role or auth schema changes.
