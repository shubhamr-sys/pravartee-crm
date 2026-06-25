import { api } from "@/lib/api";

export interface ImportedProductLineItem {
  category: string;
  product: string;
  brand: string;
  model: string;
  category_name: string;
  product_name: string;
  brand_name: string;
  model_name: string;
  quantity: number;
  uom: string;
  specification: string;
  remarks: string;
}

export interface ProductBulkUploadResult {
  message: string;
  created: {
    products: number;
    brands: number;
    models: number;
  };
  processed_rows: number;
  line_items: ImportedProductLineItem[];
  errors: { row: number; message: string }[];
}

export async function uploadProductsCsv(file: File): Promise<ProductBulkUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ProductBulkUploadResult>(
    "/api/v1/leads/masters/products/bulk-upload/",
    formData,
  );
  return data;
}

export const PRODUCT_BULK_UPLOAD_STATIC_EXAMPLE =
  "/examples/product-bulk-upload-example.csv";
