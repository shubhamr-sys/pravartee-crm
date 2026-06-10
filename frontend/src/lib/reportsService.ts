import { api, resolveApiBaseUrl } from "@/lib/api";
import type { SalesMBRReport } from "@/types/reports";

export interface SalesMBRQuery {
  year: number;
  month: number;
  salesperson?: string;
  category?: string;
}

export async function fetchSalesMBRReport(
  query: SalesMBRQuery,
): Promise<SalesMBRReport> {
  const { data } = await api.get<SalesMBRReport>("/api/v1/reports/sales/", {
    params: {
      year: query.year,
      month: query.month,
      salesperson: query.salesperson || undefined,
      category: query.category || undefined,
    },
  });
  return data;
}

export function getSalesMBRExportUrl(query: SalesMBRQuery): string {
  const params = new URLSearchParams({
    year: String(query.year),
    month: String(query.month),
  });
  if (query.salesperson) params.set("salesperson", query.salesperson);
  if (query.category) params.set("category", query.category);
  return `${resolveApiBaseUrl()}/api/v1/reports/sales/export/?${params.toString()}`;
}
