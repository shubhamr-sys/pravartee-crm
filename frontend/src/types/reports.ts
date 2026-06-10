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
  pipeline_product_quantity: number;
  won_product_quantity: number;
  average_products_per_won_deal: number;
}

export interface PipelineStageRow {
  stage: string;
  count: number;
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
  leads_managed: number;
  won_deals: number;
  lost_deals: number;
  pipeline_product_quantity: number;
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
  top_customers: TopCustomerRow[];
  salesperson_performance: SalespersonPerformanceRow[];
  salespeople: ReportSalespersonOption[];
  products?: ProductReportMetrics;
}
