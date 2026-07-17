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

export type LeadRecordType = "LEAD" | "VISIT";

export type BusinessSegment = "TRADING" | "SOLUTIONS";

export type FollowupStatus = "none" | "overdue" | "due_soon" | "normal";

export type { GutFeelingPercent } from "@/lib/gutFeelingOptions";

export interface LeadListSummary {
  total_leads: number;
  pipeline_leads: number;
  pipeline_product_quantity: number;
  upcoming_followups: number;
  overdue_followups: number;
  due_soon_followups?: number;
}

export interface LeadItem {
  id: string;
  category: string;
  category_name: string;
  product: string;
  product_name: string;
  brand: string | null;
  brand_name: string;
  model: string | null;
  model_name: string;
  quantity: number;
  uom: string;
  specification: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface LeadDocument {
  id: string;
  original_filename: string;
  file_url: string | null;
  file_size: number;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  customer_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  location_url?: string | null;
  record_type: LeadRecordType;
  next_followup_date: string | null;
  followup_status?: FollowupStatus;
  notes: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  category: string | null;
  category_name: string;
  stage: string;
  stage_name: string;
  is_completed?: boolean;
  business_segment?: BusinessSegment;
  deal_value?: string | null;
  billed_amount?: string | null;
  gross_margin_amount?: string | null;
  expected_close_date?: string | null;
  lost_reason?: string;
  competitor?: string;
  recovery_action?: string;
  gut_feeling_percent?: number | null;
  is_active: boolean;
  has_pricing_response?: boolean;
  has_pending_pricing_request?: boolean;
  items?: LeadItem[];
  documents?: LeadDocument[];
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
  pipeline?: "open" | "completed";
  next_followup_date?: string;
  next_followup_date__gte?: string;
  next_followup_date__lte?: string;
  ordering?: string;
}

export interface LeadItemFormData {
  id?: string;
  category: string;
  product: string;
  brand: string;
  model: string;
  quantity: string;
  uom: string;
  specification: string;
  remarks: string;
  /** Display labels when editing existing line items (not sent to API). */
  product_name?: string;
  brand_name?: string;
  model_name?: string;
}

export interface LeadFormData {
  customer_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  latitude: string;
  longitude: string;
  category: string;
  stage: string;
  gut_feeling_percent?: number | "" | null;
  business_segment?: BusinessSegment | "";
  deal_value?: string;
  billed_amount?: string;
  gross_margin_amount?: string;
  expected_close_date?: string;
  lost_reason?: string;
  competitor?: string;
  recovery_action?: string;
  notes: string;
  assigned_to?: string;
  record_type?: LeadRecordType;
  items: LeadItemFormData[];
  pendingDocuments: File[];
}

export function getRecordTypeLabel(recordType: LeadRecordType): string {
  return recordType === "VISIT" ? "Visit" : "Lead";
}

export function emptyLeadItem(categoryId = ""): LeadItemFormData {
  return {
    category: categoryId,
    product: "",
    brand: "",
    model: "",
    quantity: "1",
    uom: "NOS",
    specification: "",
    remarks: "",
  };
}

export function leadItemToFormData(item: LeadItem): LeadItemFormData {
  return {
    id: item.id,
    category: String(item.category),
    product: String(item.product),
    brand: item.brand ? String(item.brand) : "",
    model: item.model ? String(item.model) : "",
    quantity: String(item.quantity),
    uom: item.uom || "NOS",
    specification: item.specification ?? "",
    remarks: item.remarks ?? "",
    product_name: item.product_name,
    brand_name: item.brand_name || undefined,
    model_name: item.model_name || undefined,
  };
}

export type AssignableUser = Pick<
  User,
  "id" | "username" | "email" | "first_name" | "last_name" | "role"
>;

export interface LeadItemPayload {
  id?: string;
  category: string;
  product: string;
  brand: string | null;
  model: string | null;
  quantity: number;
  uom: string;
  specification?: string;
  remarks?: string;
}

export function buildItemsPayload(items: LeadItemFormData[]): LeadItemPayload[] {
  return items
    .filter((item) => item.category && item.product)
    .map((item) => {
      const payload: LeadItemPayload = {
        category: item.category,
        product: item.product,
        brand: item.brand || null,
        model: item.model || null,
        quantity: Number(item.quantity),
        uom: item.uom || "NOS",
        specification: item.specification.trim(),
        remarks: item.remarks.trim(),
      };
      if (item.id) {
        payload.id = item.id;
      }
      return payload;
    });
}
