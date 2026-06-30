import axios from "axios";

import { api, resolveApiBaseUrl } from "@/lib/api";
import type {
  ManualPricingLineInput,
  PricingMetrics,
  PricingQueueFilters,
  PricingQueueItem,
  PricingQueueOwner,
  PricingRequest,
  PublicPricingRequest,
} from "@/types/pricing";

const publicApi = axios.create({ timeout: 30_000 });

publicApi.interceptors.request.use((config) => {
  config.baseURL = resolveApiBaseUrl();
  return config;
});

export async function fetchLeadPricingRequests(
  leadId: string,
): Promise<PricingRequest[]> {
  const { data } = await api.get<PricingRequest[]>(
    `/api/v1/pricing/leads/${leadId}/`,
  );
  return data;
}

export async function createPricingRequest(leadId: string): Promise<PricingRequest> {
  const { data } = await api.post<PricingRequest>(
    `/api/v1/pricing/leads/${leadId}/`,
  );
  return data;
}

export async function fetchPricingMetrics(): Promise<PricingMetrics> {
  const { data } = await api.get<PricingMetrics>("/api/v1/pricing/metrics/");
  return data;
}

export type PricingQueueStatusFilter = "PENDING" | "RESPONDED" | "";

export async function fetchPricingQueueOwners(): Promise<PricingQueueOwner[]> {
  const { data } = await api.get<PricingQueueOwner[]>(
    "/api/v1/pricing/queue/owners/",
  );
  return data;
}

export async function fetchPricingQueue(
  status: PricingQueueStatusFilter = "",
  filters: PricingQueueFilters = {},
): Promise<PricingQueueItem[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.assigned_to) params.assigned_to = filters.assigned_to;
  if (filters.requested_on) params.requested_on = filters.requested_on;
  if (filters.order) params.order = filters.order;

  const { data } = await api.get<PricingQueueItem[]>("/api/v1/pricing/queue/", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return data;
}

export async function fetchPricingQueueItem(id: string): Promise<PricingQueueItem> {
  const { data } = await api.get<PricingQueueItem>(`/api/v1/pricing/queue/${id}/`);
  return data;
}

export async function submitPricingQueueItem(
  id: string,
  payload: {
    response_remarks?: string;
    price_validity: string;
    line_items: ManualPricingLineInput[];
  },
): Promise<PricingQueueItem> {
  const { data } = await api.post<PricingQueueItem>(
    `/api/v1/pricing/queue/${id}/submit/`,
    {
      response_remarks: payload.response_remarks ?? "",
      price_validity: payload.price_validity,
      line_items: payload.line_items.map((row) => ({
        lead_item_id: row.lead_item_id,
        unit_price: row.unit_price,
        remarks: row.remarks,
      })),
    },
  );
  return data;
}

export async function fetchPublicPricingRequest(
  token: string,
): Promise<PublicPricingRequest> {
  const { data } = await publicApi.get<PublicPricingRequest>(
    `/api/v1/pricing/public/${encodeURIComponent(token)}/`,
  );
  return data;
}

export async function submitPublicPricing(
  token: string,
  payload: {
    response_remarks?: string;
    price_validity: string;
    vendor_quote_pdf?: File | null;
    line_items?: ManualPricingLineInput[];
  },
): Promise<PublicPricingRequest> {
  const url = `/api/v1/pricing/public/${encodeURIComponent(token)}/submit/`;

  if (payload.vendor_quote_pdf) {
    const formData = new FormData();
    if (payload.response_remarks) {
      formData.append("response_remarks", payload.response_remarks);
    }
    formData.append("price_validity", payload.price_validity);
    formData.append("vendor_quote_pdf", payload.vendor_quote_pdf);
    if (payload.line_items?.length) {
      formData.append("line_items", JSON.stringify(payload.line_items));
    }
    const { data } = await publicApi.post<PublicPricingRequest>(url, formData);
    return data;
  }

  const { data } = await publicApi.post<PublicPricingRequest>(url, {
    response_remarks: payload.response_remarks ?? "",
    price_validity: payload.price_validity,
    line_items: (payload.line_items ?? []).map((row) => ({
      lead_item_id: row.lead_item_id,
      unit_price: row.unit_price,
      remarks: row.remarks,
    })),
  });
  return data;
}
