"""
Development settings for Pravartee CRM.
"""
from decouple import config

from .base import *  # noqa: F403

DEBUG = True

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]

# Email — use backend/.env (Gmail SMTP or console backend)
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)

# Relaxed CORS for local frontend development
CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)  # noqa: F405

INTERNAL_IPS = ["127.0.0.1", "localhost"]
