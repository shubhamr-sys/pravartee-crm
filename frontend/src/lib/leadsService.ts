import { api } from "@/lib/api";
import type {
  AssignableUser,
  Lead,
  LeadFormData,
  LeadListParams,
  LeadListSummary,
  LeadStage,
  PaginatedResponse,
  ProductCategory,
} from "@/types/lead";
import { buildItemsPayload } from "@/types/lead";

export async function fetchLeads(
  params: LeadListParams = {},
): Promise<PaginatedResponse<Lead>> {
  const { data } = await api.get<PaginatedResponse<Lead>>("/api/v1/leads/", {
    params,
  });
  return data;
}

export async function fetchLeadSummary(): Promise<LeadListSummary> {
  const { data } = await api.get<LeadListSummary>("/api/v1/leads/summary/");
  return data;
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data } = await api.get<Lead>(`/api/v1/leads/${id}/`);
  return data;
}

export async function fetchStages(): Promise<LeadStage[]> {
  const { data } = await api.get<PaginatedResponse<LeadStage> | LeadStage[]>(
    "/api/v1/leads/stages/",
  );
  return Array.isArray(data) ? data : data.results;
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get<PaginatedResponse<ProductCategory> | ProductCategory[]>(
    "/api/v1/leads/categories/",
  );
  return Array.isArray(data) ? data : data.results;
}

export async function fetchAssignableUsers(): Promise<AssignableUser[]> {
  const { data } = await api.get<AssignableUser[]>("/api/v1/auth/users/");
  return data;
}

export function toLeadApiPayload(form: LeadFormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    customer_name: form.customer_name.trim(),
    company_name: form.company_name.trim(),
    contact_person: form.contact_person.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
    stage: form.stage,
    notes: form.notes.trim(),
    record_type: form.record_type ?? "LEAD",
    items: buildItemsPayload(form.items),
  };

  if (form.category) payload.category = form.category;
  if (form.assigned_to) payload.assigned_to = form.assigned_to;
  if (form.next_followup_date) {
    payload.next_followup_date = form.next_followup_date;
  }
  if (form.latitude && form.longitude) {
    payload.latitude = Number(form.latitude).toFixed(6);
    payload.longitude = Number(form.longitude).toFixed(6);
  } else {
    payload.latitude = null;
    payload.longitude = null;
  }

  return payload;
}

export async function createLead(form: LeadFormData): Promise<Lead> {
  const { data } = await api.post<Lead>(
    "/api/v1/leads/",
    toLeadApiPayload(form),
  );
  return data;
}

export async function updateLead(id: string, form: LeadFormData): Promise<Lead> {
  const { data } = await api.patch<Lead>(
    `/api/v1/leads/${id}/`,
    toLeadApiPayload(form),
  );
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/api/v1/leads/${id}/`);
}

export async function askForPrice(id: string): Promise<{ detail?: string }> {
  const { data } = await api.post<{ detail?: string }>(
    `/api/v1/leads/${id}/ask-for-price/`,
  );
  return data;
}
