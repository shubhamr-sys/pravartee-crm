"""
Production settings for Pravartee CRM.
"""
from decouple import config

from .base import *  # noqa: F403

DEBUG = False

# Security
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# CORS — never allow all origins in production
CORS_ALLOW_ALL_ORIGINS = False

# Email (configure when ready)
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)

LOGGING["handlers"]["console"]["formatter"] = "verbose"  # noqa: F405
LOGGING["root"]["level"] = "WARNING"  # noqa: F405

# PostgreSQL — require SSL in production when connecting over the network
from config.settings.db import build_database_config

DATABASES = {
    "default": build_database_config(
        sslmode=config("DB_SSLMODE", default="require"),
    ),
}
