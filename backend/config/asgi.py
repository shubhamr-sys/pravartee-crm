"""
ASGI config for Pravartee CRM.
"""
import os
import sys
from pathlib import Path

from django.core.asgi import get_asgi_application

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_asgi_application()
