"""
Lead pipeline stage definitions and helpers.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models import QuerySet

WON_STAGE = "Won"
LOST_STAGE = "Lost"

ACTIVE_PIPELINE_STAGES: tuple[str, ...] = (
    "New",
    "Pre Bid",
    "Bid Floated",
    "Bid Evaluation",
)

CLOSED_STAGES: tuple[str, ...] = (WON_STAGE, LOST_STAGE)

ALL_STAGES_ORDER: tuple[str, ...] = ACTIVE_PIPELINE_STAGES + CLOSED_STAGES

# First funnel stage after New (for progression metrics).
FUNNEL_ENTRY_STAGE = "Pre Bid"

# Legacy stage names mapped during data migration.
LEGACY_STAGE_MAPPING: dict[str, str] = {
    "Qualified": "Pre Bid",
    "Quoted": "Bid Floated",
    "Negotiation": "Bid Evaluation",
    "Contacted": "Pre Bid",
}

SEED_STAGES: tuple[tuple[int, str], ...] = tuple(
    (index, name) for index, name in enumerate(ALL_STAGES_ORDER, start=1)
)


def is_active_pipeline_stage(stage_name: str) -> bool:
    return stage_name in ACTIVE_PIPELINE_STAGES


def is_closed_stage(stage_name: str) -> bool:
    return stage_name in CLOSED_STAGES


def active_pipeline_leads(queryset: "QuerySet") -> "QuerySet":
    """Filter queryset to leads in active pipeline stages only."""
    return queryset.filter(stage__name__in=ACTIVE_PIPELINE_STAGES)


def open_pipeline_leads(queryset: "QuerySet") -> "QuerySet":
    """Alias for active pipeline leads (excludes Won/Lost)."""
    return active_pipeline_leads(queryset)
