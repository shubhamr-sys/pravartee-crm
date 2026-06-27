import { api } from "@/lib/api";
import { createRequestCache } from "@/lib/requestCache";
import type {
  MasterBrand,
  MasterModel,
  MasterProduct,
  PaginatedMasters,
} from "@/types/master";

function unwrapResults<T>(data: PaginatedMasters<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

const productsCache = createRequestCache<MasterProduct[]>();
const brandsCache = createRequestCache<MasterBrand[]>();
const modelsCache = createRequestCache<MasterModel[]>();

export async function fetchMasterProducts(
  categoryId?: string,
): Promise<MasterProduct[]> {
  const key = categoryId ?? "__all__";
  return productsCache.fetch(key, async () => {
    const { data } = await api.get<PaginatedMasters<MasterProduct> | MasterProduct[]>(
      "/api/v1/leads/masters/products/",
      { params: categoryId ? { category: categoryId } : undefined },
    );
    return unwrapResults(data);
  });
}

export async function fetchMasterBrands(
  productId?: string,
): Promise<MasterBrand[]> {
  const key = productId ?? "__all__";
  return brandsCache.fetch(key, async () => {
    const { data } = await api.get<PaginatedMasters<MasterBrand> | MasterBrand[]>(
      "/api/v1/leads/masters/brands/",
      { params: productId ? { product: productId } : undefined },
    );
    return unwrapResults(data);
  });
}

export async function fetchMasterModels(
  brandId?: string,
): Promise<MasterModel[]> {
  const key = brandId ?? "__all__";
  return modelsCache.fetch(key, async () => {
    const { data } = await api.get<PaginatedMasters<MasterModel> | MasterModel[]>(
      "/api/v1/leads/masters/models/",
      { params: brandId ? { brand: brandId } : undefined },
    );
    return unwrapResults(data);
  });
}

export async function createMasterProduct(payload: {
  category: string;
  name: string;
}): Promise<MasterProduct> {
  const { data } = await api.post<MasterProduct>(
    "/api/v1/leads/masters/products/",
    payload,
  );
  productsCache.update(payload.category, (current) =>
    current.some((row) => row.id === data.id) ? current : [...current, data],
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
  brandsCache.update(payload.product, (current) =>
    current.some((row) => row.id === data.id) ? current : [...current, data],
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
  modelsCache.update(payload.brand, (current) =>
    current.some((row) => row.id === data.id) ? current : [...current, data],
  );
  return data;
}
