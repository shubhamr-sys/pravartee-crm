import { api } from "@/lib/api";
import type { SalesMBRReport } from "@/types/reports";

export interface SalesMBRQuery {
  year: number;
  month: number;
  salesperson?: string;
  category?: string;
}

function queryParams(query: SalesMBRQuery) {
  return {
    year: query.year,
    month: query.month,
    salesperson: query.salesperson || undefined,
    category: query.category || undefined,
  };
}

export async function fetchSalesMBRReport(
  query: SalesMBRQuery,
): Promise<SalesMBRReport> {
  const { data } = await api.get<SalesMBRReport>("/api/v1/reports/sales/", {
    params: queryParams(query),
  });
  return data;
}

export async function downloadSalesMBRExport(query: SalesMBRQuery): Promise<Blob> {
  const { data } = await api.get<Blob>("/api/v1/reports/sales/export/", {
    params: queryParams(query),
    responseType: "blob",
  });
  return data;
}
