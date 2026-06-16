export type PricingRequestStatus = "PENDING" | "RESPONDED";

export type PricingSubmissionMode = "VENDOR_UPLOAD" | "MANUAL_PRICING";

export interface PricingLeadLineItem {
  id: string;
  category_name: string;
  product_name: string;
  brand_name: string | null;
  model_name: string | null;
  quantity: number;
  uom: string;
  specification: string;
  remarks: string;
}

export interface PricingResponseLineItem {
  id: string;
  lead_item_id: string;
  category_name: string;
  product_name: string;
  brand_name: string | null;
  model_name: string | null;
  quantity: number;
  specification: string;
  unit_price: string | null;
  remarks: string;
}

export interface PricingRequest {
  id: string;
  lead: string;
  status: PricingRequestStatus;
  status_display: string;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_at: string;
  responded_at: string | null;
  submission_mode: PricingSubmissionMode | "";
  response_remarks: string;
  vendor_quote_url: string | null;
  generated_quotation_url: string | null;
  line_items?: PricingResponseLineItem[];
  lead_line_items?: PricingLeadLineItem[];
  token?: string;
}

export interface PublicPricingRequest {
  id: string;
  status: PricingRequestStatus;
  status_display: string;
  customer_name: string;
  company_name: string;
  stage_name: string;
  requested_at: string;
  responded_at: string | null;
  line_items: PricingLeadLineItem[];
}

export interface PricingMetrics {
  total_pricing_requests: number;
  pending_pricing_requests: number;
  responded_pricing_requests: number;
  average_response_time_hours: number | null;
  pricing_requests_by_status: { status: string; count: number }[];
}

export interface ManualPricingLineInput {
  lead_item_id: string;
  unit_price: string;
  remarks: string;
}
