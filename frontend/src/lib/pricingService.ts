import axios from "axios";

import { api, resolveApiBaseUrl } from "@/lib/api";
import type {
  ManualPricingLineInput,
  PricingRequest,
  PublicPricingRequest,
} from "@/types/pricing";

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

export async function fetchPublicPricingRequest(
  token: string,
): Promise<PublicPricingRequest> {
  const { data } = await axios.get<PublicPricingRequest>(
    `${resolveApiBaseUrl()}/api/v1/pricing/public/${encodeURIComponent(token)}/`,
  );
  return data;
}

export async function submitPublicPricing(
  token: string,
  payload: {
    response_remarks: string;
    line_items: ManualPricingLineInput[];
  },
): Promise<PublicPricingRequest> {
  const { data } = await axios.post<PublicPricingRequest>(
    `${resolveApiBaseUrl()}/api/v1/pricing/public/${encodeURIComponent(token)}/submit/`,
    {
      response_remarks: payload.response_remarks,
      line_items: payload.line_items.map((row) => ({
        lead_item_id: row.lead_item_id,
        unit_price: row.unit_price,
        remarks: row.remarks,
      })),
    },
  );
  return data;
}
