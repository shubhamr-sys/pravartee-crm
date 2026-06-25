import axios from "axios";

import { resolveApiBaseUrl } from "@/lib/api";
import type {
  ManualPricingLineInput,
  PricingMetrics,
  PricingRequest,
  PublicPricingRequest,
} from "@/types/pricing";

const publicApi = axios.create({ timeout: 30_000 });

publicApi.interceptors.request.use((config) => {
  config.baseURL = resolveApiBaseUrl();
  return config;
});

export async function fetchLeadPricingRequests(leadId: string): Promise<PricingRequest[]> {
  const { api } = await import("@/lib/api");
  const { data } = await api.get<PricingRequest[]>(`/api/v1/pricing/leads/${leadId}/`);
  return data;
}

export async function createPricingRequest(leadId: string): Promise<PricingRequest> {
  const { api } = await import("@/lib/api");
  const { data } = await api.post<PricingRequest>(`/api/v1/pricing/leads/${leadId}/`);
  return data;
}

export async function fetchPricingMetrics(): Promise<PricingMetrics> {
  const { api } = await import("@/lib/api");
  const { data } = await api.get<PricingMetrics>("/api/v1/pricing/metrics/");
  return data;
}

export async function fetchPublicPricingRequest(token: string): Promise<PublicPricingRequest> {
  const { data } = await publicApi.get<PublicPricingRequest>(
    `/api/v1/pricing/public/${token}/`,
  );
  return data;
}

export async function submitPublicPricing(
  token: string,
  payload: {
    response_remarks?: string;
    vendor_quote_pdf?: File | null;
    line_items?: ManualPricingLineInput[];
  },
): Promise<PublicPricingRequest> {
  const url = `/api/v1/pricing/public/${token}/submit/`;

  if (payload.vendor_quote_pdf) {
    const formData = new FormData();
    if (payload.response_remarks) {
      formData.append("response_remarks", payload.response_remarks);
    }
    formData.append("vendor_quote_pdf", payload.vendor_quote_pdf);
    if (payload.line_items?.length) {
      formData.append("line_items", JSON.stringify(payload.line_items));
    }
    const { data } = await publicApi.post<PublicPricingRequest>(url, formData);
    return data;
  }

  const { data } = await publicApi.post<PublicPricingRequest>(url, {
    response_remarks: payload.response_remarks ?? "",
    line_items: payload.line_items ?? [],
  });
  return data;
}
