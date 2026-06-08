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

export interface LeadItem {
  id: string;
  category: string;
  category_name: string;
  product: string;
  brand: string;
  model: string;
  quantity: number;
  uom: string;
  unit_price: string | number;
  total_price: string | number;
  specification: string;
  remarks: string;
  created_at: string;
  updated_at: string;
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
  category: string | null;
  category_name: string;
  stage: string;
  stage_name: string;
  is_active: boolean;
  items?: LeadItem[];
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

export interface LeadItemFormData {
  id?: string;
  category: string;
  product: string;
  brand: string;
  model: string;
  quantity: string;
  uom: string;
  unit_price: string;
  specification: string;
  remarks: string;
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
  items: LeadItemFormData[];
}

export function emptyLeadItem(categoryId = ""): LeadItemFormData {
  return {
    category: categoryId,
    product: "",
    brand: "",
    model: "",
    quantity: "1",
    uom: "NOS",
    unit_price: "0",
    specification: "",
    remarks: "",
  };
}

export function leadItemToFormData(item: LeadItem): LeadItemFormData {
  return {
    id: item.id,
    category: item.category,
    product: item.product,
    brand: item.brand,
    model: item.model,
    quantity: String(item.quantity),
    uom: item.uom || "NOS",
    unit_price: String(item.unit_price),
    specification: item.specification,
    remarks: item.remarks || "",
  };
}

export function calculateLineTotal(quantity: string, unitPrice: string): number {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
  return Math.round(qty * price * 100) / 100;
}

export function calculateItemsTotal(items: LeadItemFormData[]): number {
  return items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unit_price),
    0,
  );
}

export type AssignableUser = Pick<
  User,
  "id" | "username" | "email" | "first_name" | "last_name" | "role"
>;

export interface LeadItemPayload {
  category: string;
  product: string;
  brand?: string;
  model?: string;
  quantity: number;
  uom: string;
  unit_price: string;
  specification?: string;
  remarks?: string;
}

export function buildItemsPayload(items: LeadItemFormData[]): LeadItemPayload[] {
  return items.map((item) => ({
    category: item.category,
    product: item.product.trim(),
    brand: item.brand.trim(),
    model: item.model.trim(),
    quantity: Number(item.quantity),
    uom: item.uom || "NOS",
    unit_price: item.unit_price || "0",
    specification: item.specification.trim(),
    remarks: item.remarks.trim(),
  }));
}
