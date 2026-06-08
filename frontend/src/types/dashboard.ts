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
  revenue: string | number;
}

export interface CategoryRevenueRow {
  category: string;
  revenue: string | number;
  quantity: number;
}

export interface DashboardProductMetrics {
  pipeline_value: string | number;
  total_product_quantity: number;
  top_products: ProductMetricRow[];
  category_revenue: CategoryRevenueRow[];
}

export interface DashboardSummary {
  pipeline_value: string | number;
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
