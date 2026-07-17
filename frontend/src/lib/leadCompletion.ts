import type { Lead } from "@/types/lead";

export const COMPLETED_STAGE_NAMES = ["Won", "Lost"] as const;

export type LeadPipelineTab = "open" | "completed";

export function isCompletedLead(lead: Pick<Lead, "is_completed" | "stage_name">): boolean {
  if (lead.is_completed != null) return lead.is_completed;
  return COMPLETED_STAGE_NAMES.includes(
    lead.stage_name as (typeof COMPLETED_STAGE_NAMES)[number],
  );
}
