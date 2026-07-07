"""
Send follow-up nudge emails to all eligible lead assignees.

Schedule daily, e.g. cron:
  0 8 * * * cd /path/to/backend && .venv/bin/python manage.py send_lead_nudge_emails
"""
from django.core.management.base import BaseCommand

from apps.leads.nudge_emails import send_all_assignee_nudge_emails


class Command(BaseCommand):
    help = "Email lead assignees about overdue, due-today, and missing follow-ups."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many emails would be sent without sending.",
        )

    def handle(self, *args, **options):
        stats = send_all_assignee_nudge_emails(dry_run=options["dry_run"])
        mode = "Would send" if options["dry_run"] else "Sent"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode} {stats.sent} nudge email(s); skipped {stats.skipped}.",
            ),
        )
        for error in stats.errors:
            self.stderr.write(self.style.ERROR(error))
