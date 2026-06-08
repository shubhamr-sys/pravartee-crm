export interface SalesMBRFilters {
  year: number;
  month: number;
  month_name: string;
  salesperson_id: string | null;
}

export interface SalesPerformanceSummary {
  total_leads: number;
  active_pipeline_leads: number;
  qualified_leads?: number;
  won_deals: number;
  lost_deals: number;
  win_rate: number;
  pipeline_value: string;
  revenue: string;
  average_deal_size: string;
}

export interface PipelineStageRow {
  stage: string;
  count: number;
  value: string;
}

export interface TopCustomerRow {
  customer: string;
  company: string;
  value: string;
  stage: string;
}

export interface SalespersonPerformanceRow {
  user_id: string;
  user: string;
  leads_managed: number;
  won_deals: number;
  lost_deals: number;
  pipeline_value: string;
  conversion_rate: number;
  win_rate?: number;
}

export interface ReportSalespersonOption {
  id: string;
  name: string;
}

export interface ProductReportRow {
  product: string;
  category?: string;
  brand?: string;
  quantity: number;
  revenue: string;
}

export interface CategoryReportRow {
  category: string;
  quantity: number;
  revenue: string;
}

export interface BrandReportRow {
  brand: string;
  quantity: number;
  revenue: string;
}

export interface ProductReportMetrics {
  quantity_by_product: ProductReportRow[];
  revenue_by_product: ProductReportRow[];
  revenue_by_category: CategoryReportRow[];
  revenue_by_brand: BrandReportRow[];
  top_selling_products: ProductReportRow[];
  pipeline_product_quantity: number;
  won_product_revenue: string;
}

export interface SalesMBRReport {
  filters: SalesMBRFilters;
  performance_summary: SalesPerformanceSummary;
  pipeline_by_stage: PipelineStageRow[];
  top_customers: TopCustomerRow[];
  salesperson_performance: SalespersonPerformanceRow[];
  salespeople: ReportSalespersonOption[];
  products?: ProductReportMetrics;
}
