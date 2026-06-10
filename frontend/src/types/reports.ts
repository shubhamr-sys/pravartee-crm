export interface SalesMBRFilters {
  year: number;
  month: number;
  month_name: string;
  salesperson_id: string | null;
  category_id: string | null;
}

export interface SalesPerformanceSummary {
  total_leads: number;
  active_pipeline_leads: number;
  qualified_leads?: number;
  won_deals: number;
  lost_deals: number;
  win_rate: number;
  pipeline_product_quantity: number;
  won_product_quantity: number;
  average_products_per_won_deal: number;
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
  performance_summary: SalesPerformanceSummary;
  pipeline_by_stage: PipelineStageRow[];
  category_analysis: CategoryAnalysisRow[];
  top_products: TopProductRow[];
  top_customers: TopCustomerRow[];
  salesperson_performance: SalespersonPerformanceRow[];
  follow_up_analysis: FollowUpAnalysis;
  salespeople: ReportSalespersonOption[];
  categories: ReportCategoryOption[];
  products?: ProductReportMetrics;
}
