import type { LeadActivity } from "@/types/activity";
import type { AttendanceMetrics } from "@/types/attendance";
import type { Lead } from "@/types/lead";

export interface StageCount {
  stage__name: string;
  count: number;
}

export interface ProductMetricRow {
  product: string;
  quantity: number;
}

export interface CategoryQuantityRow {
  category: string;
  quantity: number;
}

export interface DashboardProductMetrics {
  total_product_quantity: number;
  top_products: ProductMetricRow[];
  category_quantity: CategoryQuantityRow[];
}

export interface DashboardSummary {
  pipeline_leads: number;
  total_active_leads: number;
  stale_leads_count: number;
  stale_lead_threshold_days?: number;
  leads_by_stage: StageCount[];
  upcoming_followups: Lead[];
  recent_lead_updates: Lead[];
  recent_activities?: LeadActivity[];
  attendance?: AttendanceMetrics;
  products?: DashboardProductMetrics;
}
