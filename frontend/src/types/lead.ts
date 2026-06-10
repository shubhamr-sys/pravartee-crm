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

export type FollowupStatus = "none" | "overdue" | "due_soon" | "normal";

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

export interface Lead {
  id: string;
  customer_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
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
}

export interface LeadFormData {
  customer_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  category: string;
  stage: string;
  next_followup_date?: string;
  notes: string;
  assigned_to?: string;
  record_type?: LeadRecordType;
  items: LeadItemFormData[];
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
    category: item.category,
    product: item.product,
    brand: item.brand || "",
    model: item.model || "",
    quantity: String(item.quantity),
    uom: item.uom || "NOS",
    specification: item.specification,
    remarks: item.remarks || "",
  };
}

export type AssignableUser = Pick<
  User,
  "id" | "username" | "email" | "first_name" | "last_name" | "role"
>;

export interface LeadItemPayload {
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
    .map((item) => ({
      category: item.category,
      product: item.product,
      brand: item.brand || null,
      model: item.model || null,
      quantity: Number(item.quantity),
      uom: item.uom || "NOS",
      specification: item.specification.trim(),
      remarks: item.remarks.trim(),
    }));
}
