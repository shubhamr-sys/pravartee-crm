import { api } from "@/lib/api";
import type {
  MasterBrand,
  MasterModel,
  MasterProduct,
  PaginatedMasters,
} from "@/types/master";

function unwrapResults<T>(data: PaginatedMasters<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function fetchMasterProducts(
  categoryId?: string,
): Promise<MasterProduct[]> {
  const { data } = await api.get<PaginatedMasters<MasterProduct> | MasterProduct[]>(
    "/api/v1/leads/masters/products/",
    { params: categoryId ? { category: categoryId } : undefined },
  );
  return unwrapResults(data);
}

export async function fetchMasterBrands(
  productId?: string,
): Promise<MasterBrand[]> {
  const { data } = await api.get<PaginatedMasters<MasterBrand> | MasterBrand[]>(
    "/api/v1/leads/masters/brands/",
    { params: productId ? { product: productId } : undefined },
  );
  return unwrapResults(data);
}

export async function fetchMasterModels(
  brandId?: string,
): Promise<MasterModel[]> {
  const { data } = await api.get<PaginatedMasters<MasterModel> | MasterModel[]>(
    "/api/v1/leads/masters/models/",
    { params: brandId ? { brand: brandId } : undefined },
  );
  return unwrapResults(data);
}

export async function createMasterProduct(payload: {
  category: string;
  name: string;
}): Promise<MasterProduct> {
  const { data } = await api.post<MasterProduct>(
    "/api/v1/leads/masters/products/",
    payload,
  );
  return data;
}

export async function createMasterBrand(payload: {
  product: string;
  name: string;
}): Promise<MasterBrand> {
  const { data } = await api.post<MasterBrand>(
    "/api/v1/leads/masters/brands/",
    payload,
  );
  return data;
}

export async function createMasterModel(payload: {
  brand: string;
  name: string;
}): Promise<MasterModel> {
  const { data } = await api.post<MasterModel>(
    "/api/v1/leads/masters/models/",
    payload,
  );
  return data;
}
