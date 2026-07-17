"""
Field visit check-in / check-out business logic.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.visits.choices import VisitActivityType, VisitStatus
from apps.visits.models import FieldVisit, VisitActivity

User = get_user_model()


def _calculate_duration_hours(check_in_time, check_out_time) -> Decimal:
    delta = check_out_time - check_in_time
    if delta.total_seconds() < 0:
        raise ValidationError("Cannot check out before checking in.")
    hours = Decimal(str(delta.total_seconds() / 3600))
    return hours.quantize(Decimal("0.01"))


def log_visit_activity(
    visit: FieldVisit,
    activity_type: str,
    user: User | None = None,
    comments: str = "",
) -> VisitActivity:
    return VisitActivity.objects.create(
        visit=visit,
        user=user,
        activity_type=activity_type,
        comments=comments,
    )


def get_active_visit(user: User) -> FieldVisit | None:
    return (
        FieldVisit.objects.filter(user=user, status=VisitStatus.IN_PROGRESS)
        .prefetch_related("activities", "activities__user")
        .order_by("-check_in_time")
        .first()
    )


def check_in(
    user: User,
    *,
    department_name: str,
    latitude: float,
    longitude: float,
    purpose: str = "",
    contact_person: str = "",
    mobile: str = "",
    designation: str = "",
) -> FieldVisit:
    if get_active_visit(user):
        raise ValidationError(
            "You already have an active visit. Check out before starting a new one.",
        )

    name = (department_name or "").strip()
    if not name:
        raise ValidationError({"department_name": "Department name is required."})

    contact = (contact_person or "").strip()
    if not contact:
        raise ValidationError({"contact_person": "Contact person is required."})

    phone = (mobile or "").strip()
    if not phone:
        raise ValidationError({"mobile": "Mobile number is required."})

    visit = FieldVisit.objects.create(
        user=user,
        department_name=name,
        contact_person=contact,
        mobile=phone,
        designation=(designation or "").strip(),
        purpose=(purpose or "").strip(),
        status=VisitStatus.IN_PROGRESS,
        check_in_time=timezone.now(),
        check_in_latitude=Decimal(str(latitude)),
        check_in_longitude=Decimal(str(longitude)),
    )
    log_visit_activity(
        visit,
        VisitActivityType.CHECK_IN,
        user=user,
        comments=(
            f"Checked in at {name}. Contact: {contact}"
            + (f" ({designation})" if designation else "")
            + f", {phone}."
        ),
    )
    return visit


def check_out(
    user: User,
    *,
    latitude: float,
    longitude: float,
    notes: str = "",
) -> FieldVisit:
    visit = get_active_visit(user)
    if visit is None:
        raise ValidationError("You must check in before checking out.")

    now = timezone.now()
    if now < visit.check_in_time:
        raise ValidationError("Cannot check out before checking in.")

    visit.check_out_time = now
    visit.check_out_latitude = Decimal(str(latitude))
    visit.check_out_longitude = Decimal(str(longitude))
    visit.duration_hours = _calculate_duration_hours(visit.check_in_time, now)
    visit.status = VisitStatus.COMPLETED
    if notes:
        visit.notes = notes.strip()
    visit.save(
        update_fields=[
            "check_out_time",
            "check_out_latitude",
            "check_out_longitude",
            "duration_hours",
            "status",
            "notes",
            "updated_at",
        ],
    )
    log_visit_activity(
        visit,
        VisitActivityType.CHECK_OUT,
        user=user,
        comments=(
            f"Checked out. Duration: {visit.duration_hours} hrs."
            + (f" Notes: {visit.notes}" if visit.notes else "")
        ),
    )
    return visit
