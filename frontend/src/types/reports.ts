export interface SalesMBRFilters {
  year: number;
  month: number;
  month_name: string;
  salesperson_id: string | null;
  category_id: string | null;
}

export interface SalesMBRMetricScopes {
  period: string;
  snapshot: string;
}

export interface SalesSegmentPerformance {
  segment: string;
  segment_display: string;
  order_booking: number;
  order_booking_target: number;
  order_booking_var_pct: number | null;
  revenue: number;
  revenue_target: number;
  revenue_var_pct: number | null;
  gross_margin: number;
  gross_margin_target: number;
  gross_margin_var_pct: number | null;
  gross_margin_pct: number | null;
  deals_won: number;
  deals_won_target: number;
  avg_deal_size: number;
}

export interface SalesPerformancePack {
  trading: SalesSegmentPerformance;
  solutions: SalesSegmentPerformance;
  total: SalesSegmentPerformance;
}

export interface TopCustomerRevenueRow {
  lead_id: string;
  customer: string;
  company: string;
  segment: string;
  segment_display: string;
  revenue: number;
  gross_margin: number;
  gross_margin_pct: number | null;
  collection_status: string;
}

export interface ForwardPipelineOpportunity {
  lead_id: string;
  customer: string;
  company: string;
  segment: string;
  segment_display: string;
  stage: string;
  value: number;
  win_probability: number;
  weighted_value: number;
  expected_close_month: string;
  expected_close_date: string | null;
}

export interface ForwardPipeline {
  opportunities: ForwardPipelineOpportunity[];
  total_pipeline_value: number;
  total_weighted_pipeline: number;
}

export interface LostDealRow {
  lead_id: string;
  customer: string;
  company: string;
  value: number;
  stage_lost: string;
  reason: string;
  competitor: string;
  recovery_action: string;
}

export interface SalesPerformanceSummary {
  total_leads: number;
  active_pipeline_leads: number;
  won_deals: number;
  lost_deals: number;
  win_rate: number;
  pipeline_product_quantity: number;
  won_product_quantity: number;
  average_products_per_won_deal: number;
  order_booking?: number;
  revenue?: number;
  gross_margin?: number;
  gross_margin_pct?: number | null;
  weighted_pipeline?: number;
}

export interface PipelineStageRow {
  stage: string;
  count: number;
  percentage?: number;
}

export interface CategoryAnalysisRow {
  category: string;
  lead_count: number;
  product_quantity: number;
  pipeline_share_percentage: number;
}

export interface TopProductRow {
  product: string;
  quantity: number;
  lead_count: number;
}

export interface TopCustomerRow {
  lead_id?: string;
  customer: string;
  company: string;
  product_quantity: number;
  stage: string;
}

export interface SalespersonPerformanceRow {
  user_id: string;
  user: string;
  assigned_leads?: number;
  leads_managed: number;
  won_deals: number;
  lost_deals: number;
  pipeline_product_quantity: number;
  conversion_rate: number;
  win_rate?: number;
  followups_completed?: number;
}

export interface FollowUpAnalysis {
  today_followups: number;
  overdue_followups: number;
  completed_followups: number;
}

export interface PricingAnalysis {
  total_pricing_requests: number;
  pending_pricing_requests: number;
  responded_pricing_requests: number;
  average_response_time_hours: number | null;
  pricing_requests_by_status: { status: string; count: number }[];
}

export interface ReportSalespersonOption {
  id: string;
  name: string;
}

export interface ReportCategoryOption {
  id: string;
  name: string;
}

export interface ProductReportRow {
  product: string;
  category?: string;
  brand?: string;
  quantity: number;
}

export interface CategoryReportRow {
  category: string;
  quantity: number;
}

export interface BrandReportRow {
  brand: string;
  quantity: number;
}

export interface ProductReportMetrics {
  quantity_by_product: ProductReportRow[];
  quantity_by_category: CategoryReportRow[];
  quantity_by_brand: BrandReportRow[];
  top_selling_products: ProductReportRow[];
  pipeline_product_quantity: number;
  won_product_quantity: number;
}

export interface SalesMBRReport {
  filters: SalesMBRFilters;
  metric_scopes?: SalesMBRMetricScopes;
  sales_performance?: SalesPerformancePack;
  top_customers_by_revenue?: TopCustomerRevenueRow[];
  forward_pipeline?: ForwardPipeline;
  lost_deals?: LostDealRow[];
  performance_summary: SalesPerformanceSummary;
  pipeline_by_stage: PipelineStageRow[];
  category_analysis: CategoryAnalysisRow[];
  top_products: TopProductRow[];
  top_customers: TopCustomerRow[];
  salesperson_performance: SalespersonPerformanceRow[];
  follow_up_analysis: FollowUpAnalysis;
  pricing_analysis?: PricingAnalysis;
  salespeople: ReportSalespersonOption[];
  categories: ReportCategoryOption[];
  products?: ProductReportMetrics;
}
