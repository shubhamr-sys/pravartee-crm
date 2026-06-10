"""
PostgreSQL database configuration for Pravartee CRM.

All values are loaded via python-decouple from environment variables / .env.
"""
from decouple import config


def build_database_config(*, sslmode: str | None = None) -> dict:
    """
    Build Django DATABASES['default'] dict with production-safe defaults.

    Args:
        sslmode: If set, passed to psycopg as sslmode (e.g. 'require' in production).
    """
    options = {
        "connect_timeout": config("DB_CONNECT_TIMEOUT", default=10, cast=int),
        "options": config(
            "DB_OPTIONS",
            default="-c search_path=public",
        ),
    }

    effective_sslmode = sslmode if sslmode is not None else config("DB_SSLMODE", default="")
    if effective_sslmode:
        options["sslmode"] = effective_sslmode

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="pravartee_crm"),
        "USER": config("DB_USER", default="crm_user"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
        "CONN_HEALTH_CHECKS": config("DB_CONN_HEALTH_CHECKS", default=True, cast=bool),
        "ATOMIC_REQUESTS": config("DB_ATOMIC_REQUESTS", default=False, cast=bool),
        "OPTIONS": options,
        "TEST": {
            "NAME": config("DB_TEST_NAME", default="test_pravartee_crm"),
        },
    }
