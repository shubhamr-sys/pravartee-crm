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
    vendor_quote_pdf: File | null;
    line_items: ManualPricingLineInput[];
  },
): Promise<PublicPricingRequest> {
  const formData = new FormData();
  if (payload.response_remarks) {
    formData.append("response_remarks", payload.response_remarks);
  }
  if (payload.vendor_quote_pdf) {
    formData.append("vendor_quote_pdf", payload.vendor_quote_pdf);
  }
  if (payload.line_items.length > 0) {
    formData.append(
      "line_items",
      JSON.stringify(
        payload.line_items.map((row) => ({
          lead_item_id: row.lead_item_id,
          unit_price: row.unit_price,
          remarks: row.remarks,
        })),
      ),
    );
  }

  const { data } = await axios.post<PublicPricingRequest>(
    `${resolveApiBaseUrl()}/api/v1/pricing/public/${encodeURIComponent(token)}/submit/`,
    formData,
  );
  return data;
}
