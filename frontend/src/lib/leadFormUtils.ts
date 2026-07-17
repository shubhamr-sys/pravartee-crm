import type { Lead, LeadFormData } from "@/types/lead";
import { emptyLeadItem, leadItemToFormData } from "@/types/lead";

function toFormId(value: string | null | undefined): string {
  return value ? String(value) : "";
}

function normalizeGutFeelingPercent(
  value: Lead["gut_feeling_percent"],
): LeadFormData["gut_feeling_percent"] {
  if (value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

/** Map API lead to form state for create/edit — normalizes IDs and select values. */
export function leadToFormData(lead: Lead): LeadFormData {
  const items =
    lead.items && lead.items.length > 0
      ? lead.items.map(leadItemToFormData)
      : [emptyLeadItem(lead.category || "")];

  return {
    customer_name: lead.customer_name ?? "",
    company_name: lead.company_name ?? "",
    contact_person: lead.contact_person ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    address: lead.address ?? "",
    latitude: lead.latitude ? Number(lead.latitude).toFixed(6) : "",
    longitude: lead.longitude ? Number(lead.longitude).toFixed(6) : "",
    category: toFormId(lead.category),
    stage: toFormId(lead.stage),
    gut_feeling_percent: normalizeGutFeelingPercent(lead.gut_feeling_percent),
    business_segment: lead.business_segment || "",
    deal_value: lead.deal_value != null ? String(lead.deal_value) : "",
    billed_amount: lead.billed_amount != null ? String(lead.billed_amount) : "",
    gross_margin_amount:
      lead.gross_margin_amount != null ? String(lead.gross_margin_amount) : "",
    expected_close_date: lead.expected_close_date ?? "",
    lost_reason: lead.lost_reason ?? "",
    competitor: lead.competitor ?? "",
    recovery_action: lead.recovery_action ?? "",
    notes: lead.notes ?? "",
    assigned_to: toFormId(lead.assigned_to),
    record_type: lead.record_type || "LEAD",
    items,
    pendingDocuments: [],
  };
}
