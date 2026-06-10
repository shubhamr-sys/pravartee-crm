export interface MasterProduct {
  id: string;
  category: string;
  category_name: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface MasterBrand {
  id: string;
  product: string;
  product_name: string;
  category_name: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface MasterModel {
  id: string;
  brand: string;
  brand_name: string;
  product_name: string;
  category_name: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedMasters<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
