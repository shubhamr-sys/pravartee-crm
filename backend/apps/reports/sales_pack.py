"""
Sales MBR pack — Sales tab aggregations (Trading / Solutions, ₹ metrics).
"""
from decimal import Decimal

from apps.leads.models import BusinessSegment, Lead
from apps.leads.stages import LOST_STAGE, active_pipeline_leads
from apps.reports.models import SalesMonthlyTarget

ZERO = Decimal("0.00")


def _money(value) -> float:
    if value is None:
        return 0.0
    return float(Decimal(str(value)).quantize(Decimal("0.01")))


def _pct(numerator, denominator) -> float | None:
    if not denominator:
        return None
    return round(float(numerator) / float(denominator) * 100, 1)


def _var_pct(actual, target) -> float | None:
    if target in (None, 0, ZERO, 0.0):
        return None
    return round((float(actual) - float(target)) / float(target) * 100, 1)


def _segment_sums(leads_qs) -> dict[str, dict]:
    result = {
        BusinessSegment.TRADING: {
            "order_booking": ZERO,
            "revenue": ZERO,
            "gross_margin": ZERO,
            "deals_won": 0,
        },
        BusinessSegment.SOLUTIONS: {
            "order_booking": ZERO,
            "revenue": ZERO,
            "gross_margin": ZERO,
            "deals_won": 0,
        },
    }
    for lead in leads_qs:
        seg = lead.business_segment or BusinessSegment.TRADING
        if seg not in result:
            seg = BusinessSegment.TRADING
        booking = lead.deal_value or ZERO
        billed = lead.effective_billed_amount() or ZERO
        margin = lead.gross_margin_amount or ZERO
        result[seg]["order_booking"] += booking
        result[seg]["revenue"] += billed
        result[seg]["gross_margin"] += margin
        result[seg]["deals_won"] += 1
    return result


def _target_map(year: int, month: int) -> dict[str, SalesMonthlyTarget]:
    return {
        row.segment: row
        for row in SalesMonthlyTarget.objects.filter(year=year, month=month)
    }


def build_sales_performance_summary(won_leads, year: int, month: int) -> dict:
    """Pack section 1 — Trading / Solutions / Total with targets."""
    by_seg = _segment_sums(won_leads)
    targets = _target_map(year, month)

    def row_for(seg: str) -> dict:
        data = by_seg[seg]
        target = targets.get(seg)
        booking = data["order_booking"]
        revenue = data["revenue"]
        margin = data["gross_margin"]
        deals = data["deals_won"]
        booking_t = target.order_booking_target if target else ZERO
        revenue_t = target.revenue_target if target else ZERO
        margin_t = target.gross_margin_target if target else ZERO
        deals_t = target.deals_won_target if target else 0
        return {
            "segment": seg,
            "segment_display": BusinessSegment(seg).label,
            "order_booking": _money(booking),
            "order_booking_target": _money(booking_t),
            "order_booking_var_pct": _var_pct(booking, booking_t),
            "revenue": _money(revenue),
            "revenue_target": _money(revenue_t),
            "revenue_var_pct": _var_pct(revenue, revenue_t),
            "gross_margin": _money(margin),
            "gross_margin_target": _money(margin_t),
            "gross_margin_var_pct": _var_pct(margin, margin_t),
            "gross_margin_pct": _pct(margin, revenue),
            "deals_won": deals,
            "deals_won_target": deals_t,
            "avg_deal_size": _money(revenue / deals) if deals else 0.0,
        }

    trading = row_for(BusinessSegment.TRADING)
    solutions = row_for(BusinessSegment.SOLUTIONS)

    total_booking = trading["order_booking"] + solutions["order_booking"]
    total_revenue = trading["revenue"] + solutions["revenue"]
    total_margin = trading["gross_margin"] + solutions["gross_margin"]
    total_deals = trading["deals_won"] + solutions["deals_won"]
    total_booking_t = trading["order_booking_target"] + solutions["order_booking_target"]
    total_revenue_t = trading["revenue_target"] + solutions["revenue_target"]
    total_margin_t = trading["gross_margin_target"] + solutions["gross_margin_target"]
    total_deals_t = trading["deals_won_target"] + solutions["deals_won_target"]

    total = {
        "segment": "TOTAL",
        "segment_display": "Total",
        "order_booking": round(total_booking, 2),
        "order_booking_target": round(total_booking_t, 2),
        "order_booking_var_pct": _var_pct(total_booking, total_booking_t),
        "revenue": round(total_revenue, 2),
        "revenue_target": round(total_revenue_t, 2),
        "revenue_var_pct": _var_pct(total_revenue, total_revenue_t),
        "gross_margin": round(total_margin, 2),
        "gross_margin_target": round(total_margin_t, 2),
        "gross_margin_var_pct": _var_pct(total_margin, total_margin_t),
        "gross_margin_pct": _pct(total_margin, total_revenue),
        "deals_won": total_deals,
        "deals_won_target": total_deals_t,
        "avg_deal_size": round(total_revenue / total_deals, 2) if total_deals else 0.0,
    }

    return {
        "trading": trading,
        "solutions": solutions,
        "total": total,
    }


def build_top_customers_by_revenue(won_leads, limit: int = 10) -> list[dict]:
    """Pack section 2 — top customers by billed revenue in period."""
    rows = []
    for lead in won_leads:
        revenue = lead.effective_billed_amount() or ZERO
        margin = lead.gross_margin_amount or ZERO
        rows.append(
            {
                "lead_id": str(lead.id),
                "customer": lead.customer_name,
                "company": lead.company_name or "—",
                "segment": lead.business_segment,
                "segment_display": BusinessSegment(
                    lead.business_segment or BusinessSegment.TRADING,
                ).label,
                "revenue": _money(revenue),
                "gross_margin": _money(margin),
                "gross_margin_pct": _pct(margin, revenue),
                "collection_status": "—",
            }
        )
    rows.sort(key=lambda item: item["revenue"], reverse=True)
    return rows[:limit]


def build_forward_pipeline(open_leads, limit: int = 20) -> dict:
    """Pack section 3 — forward-looking pipeline with weighted value."""
    rows = []
    total_value = ZERO
    total_weighted = ZERO
    for lead in open_leads.order_by("-deal_value", "-updated_at")[:limit]:
        value = lead.deal_value or ZERO
        prob = lead.gut_feeling_percent or 0
        weighted = (value * prob) / 100 if value else ZERO
        total_value += value
        total_weighted += weighted
        rows.append(
            {
                "lead_id": str(lead.id),
                "customer": lead.customer_name,
                "company": lead.company_name or "—",
                "segment": lead.business_segment,
                "segment_display": BusinessSegment(
                    lead.business_segment or BusinessSegment.TRADING,
                ).label,
                "stage": lead.stage.name,
                "value": _money(value),
                "win_probability": prob,
                "weighted_value": _money(weighted),
                "expected_close_month": (
                    lead.expected_close_date.strftime("%b %Y")
                    if lead.expected_close_date
                    else "—"
                ),
                "expected_close_date": (
                    lead.expected_close_date.isoformat()
                    if lead.expected_close_date
                    else None
                ),
            }
        )

    # Full open pipeline totals (not just limited rows)
    full_value = ZERO
    full_weighted = ZERO
    for lead in open_leads:
        value = lead.deal_value or ZERO
        full_value += value
        full_weighted += (value * (lead.gut_feeling_percent or 0)) / 100

    return {
        "opportunities": rows,
        "total_pipeline_value": _money(full_value),
        "total_weighted_pipeline": _money(full_weighted),
    }


def build_lost_deals(lost_leads, limit: int = 20) -> list[dict]:
    """Pack section 4 — lost / slipped deals."""
    rows = []
    for lead in lost_leads.order_by("-updated_at")[:limit]:
        rows.append(
            {
                "lead_id": str(lead.id),
                "customer": lead.customer_name,
                "company": lead.company_name or "—",
                "value": _money(lead.deal_value),
                "stage_lost": lead.stage.name if lead.stage_id else LOST_STAGE,
                "reason": lead.lost_reason or "—",
                "competitor": lead.competitor or "—",
                "recovery_action": lead.recovery_action or "—",
            }
        )
    return rows


def build_sales_pack_sections(
    leads_qs,
    won_ids: set,
    lost_ids: set,
    year: int,
    month: int,
) -> dict:
    won_leads = (
        leads_qs.filter(id__in=won_ids).select_related("category", "stage")
        if won_ids
        else Lead.objects.none()
    )
    lost_leads = (
        leads_qs.filter(id__in=lost_ids).select_related("stage")
        if lost_ids
        else Lead.objects.none()
    )
    open_pipeline = active_pipeline_leads(leads_qs).select_related("stage", "category")

    return {
        "sales_performance": build_sales_performance_summary(won_leads, year, month),
        "top_customers_by_revenue": build_top_customers_by_revenue(won_leads),
        "forward_pipeline": build_forward_pipeline(open_pipeline),
        "lost_deals": build_lost_deals(lost_leads),
    }
