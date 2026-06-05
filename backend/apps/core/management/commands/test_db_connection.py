"""
Verify PostgreSQL connectivity using Django's configured DATABASES.
"""
import sys
import time

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Test PostgreSQL connection (pravartee_crm / crm_user)"

    def handle(self, *args, **options):
        settings = connection.settings_dict
        self.stdout.write(
            f"Target: {settings['USER']}@{settings['HOST']}:{settings['PORT']}/{settings['NAME']}"
        )

        start = time.perf_counter()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                cursor.execute("SELECT current_database(), current_user;")
                db_name, db_user = cursor.fetchone()
                cursor.execute("SHOW server_version;")
                server_version = cursor.fetchone()[0]
        except OperationalError as exc:
            self.stderr.write(self.style.ERROR(f"Connection failed: {exc}"))
            self.stderr.write(
                "\nSee deployment/postgresql/README.md → Troubleshooting\n"
            )
            sys.exit(1)

        elapsed_ms = (time.perf_counter() - start) * 1000
        self.stdout.write(self.style.SUCCESS(f"Connected in {elapsed_ms:.1f} ms"))
        self.stdout.write(f"  Server version : {server_version}")
        self.stdout.write(f"  Version string : {version[:80]}...")
        self.stdout.write(f"  Database       : {db_name}")
        self.stdout.write(f"  Session user   : {db_user}")
