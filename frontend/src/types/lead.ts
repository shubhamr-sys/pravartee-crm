import type { User } from "@/types/user";

export interface LeadStage {
  id: string;
  name: string;
  sequence: number;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type FollowupStatus = "none" | "overdue" | "due_soon" | "normal";

export interface LeadListSummary {
  total_leads: number;
  pipeline_value: string | number;
  upcoming_followups: number;
  overdue_followups: number;
  due_soon_followups?: number;
}

export interface Lead {
  id: string;
  customer_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  estimated_value: string | number;
  lead_source: string;
  next_followup_date: string | null;
  followup_status?: FollowupStatus;
  notes: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  category: string;
  category_name: string;
  stage: string;
  stage_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LeadListParams {
  page?: number;
  search?: string;
  stage?: string;
  category?: string;
  assigned_to?: string;
  next_followup_date?: string;
  next_followup_date__gte?: string;
  next_followup_date__lte?: string;
  ordering?: string;
}

export const LEAD_SOURCE_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "TENDER", label: "Tender" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "EXISTING_CUSTOMER", label: "Existing Customer" },
  { value: "WALK_IN", label: "Walk-In" },
  { value: "OTHER", label: "Other" },
] as const;

export function getLeadSourceLabel(source: string): string {
  return LEAD_SOURCE_OPTIONS.find((item) => item.value === source)?.label ?? source;
}

export interface LeadFormData {
  customer_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  estimated_value: string;
  category: string;
  stage: string;
  next_followup_date?: string;
  notes: string;
  assigned_to?: string;
  lead_source?: string;
}

export type AssignableUser = Pick<
  User,
  "id" | "username" | "email" | "first_name" | "last_name" | "role"
>;
