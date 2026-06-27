"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import CategorySelectField from "@/components/leads/CategorySelectField";
import MasterAddModal from "@/components/leads/MasterAddModal";
import ProductBulkUploadModal from "@/components/leads/ProductBulkUploadModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useAuth } from "@/context/AuthContext";
import {
  createMasterBrand,
  createMasterModel,
  createMasterProduct,
  fetchMasterBrands,
  fetchMasterModels,
  fetchMasterProducts,
} from "@/lib/mastersService";
import { LEAD_ITEM_UOM_OPTIONS } from "@/lib/leadItemUom";
import type { ImportedProductLineItem } from "@/lib/productImportService";
import type { MasterBrand, MasterModel, MasterProduct } from "@/types/master";
import {
  emptyLeadItem,
  type LeadItemFormData,
  type ProductCategory,
} from "@/types/lead";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

interface LeadItemsEditorProps {
  items: LeadItemFormData[];
  categories: ProductCategory[];
  onChange: (items: LeadItemFormData[]) => void;
  errors?: Record<string, string>;
  allowBulkUpload?: boolean;
}

interface RowMasters {
  products: MasterProduct[];
  brands: MasterBrand[];
  models: MasterModel[];
}

export default function LeadItemsEditor({
  items,
  categories,
  onChange,
  errors = {},
  allowBulkUpload = false,
}: LeadItemsEditorProps) {
  const { canCreateMaster } = useAuth();
  const [rowMasters, setRowMasters] = useState<Record<number, RowMasters>>({});
  const [addModal, setAddModal] = useState<{
    row: number;
    type: "product" | "brand" | "model";
    initialName: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<
    Record<number, { product?: string; brand?: string; model?: string }>
  >({});
  const [loadingMasters, setLoadingMasters] = useState<Record<string, boolean>>({});
  const mastersLoadedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());

  const itemsMastersKey = items
    .map(
      (item) =>
        `${item.id ?? ""}|${item.category}|${item.product}|${item.brand}|${item.model}|${item.product_name ?? ""}|${item.brand_name ?? ""}|${item.model_name ?? ""}`,
    )
    .join(";");

  useEffect(() => {
    setSelectedLabels((current) => {
      const next = { ...current };
      items.forEach((item, index) => {
        next[index] = {
          product: item.product_name || current[index]?.product,
          brand: item.brand_name || current[index]?.brand,
          model: item.model_name || current[index]?.model,
        };
      });
      return next;
    });
  }, [itemsMastersKey, items]);

  function setMasterLoading(key: string, loading: boolean) {
    setLoadingMasters((current) => {
      if (loading) return { ...current, [key]: true };
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function clearRowMasterCache(
    index: number,
    types: Array<"products" | "brands" | "models"> = ["products", "brands", "models"],
  ) {
    for (const key of [...mastersLoadedRef.current]) {
      if (types.some((type) => key.startsWith(`${index}:${type}:`))) {
        mastersLoadedRef.current.delete(key);
      }
    }
  }

  const ensureProductsLoaded = useCallback(
    async (index: number) => {
      const item = items[index];
      if (!item?.category) return;

      const cacheKey = `${index}:products:${item.category}`;
      if (mastersLoadedRef.current.has(cacheKey) || inFlightRef.current.has(cacheKey)) {
        return;
      }

      inFlightRef.current.add(cacheKey);
      setMasterLoading(`${index}-products`, true);
      try {
        const products = await fetchMasterProducts(item.category);
        mastersLoadedRef.current.add(cacheKey);
        setRowMasters((current) => ({
          ...current,
          [index]: {
            products,
            brands: current[index]?.brands ?? [],
            models: current[index]?.models ?? [],
          },
        }));
        setSelectedLabels((current) => ({
          ...current,
          [index]: {
            ...current[index],
            product:
              item.product_name ||
              products.find((row) => row.id === item.product)?.name ||
              current[index]?.product,
          },
        }));
      } finally {
        inFlightRef.current.delete(cacheKey);
        setMasterLoading(`${index}-products`, false);
      }
    },
    [items],
  );

  const ensureBrandsLoaded = useCallback(
    async (index: number) => {
      const item = items[index];
      if (!item?.product) return;

      const cacheKey = `${index}:brands:${item.product}`;
      if (mastersLoadedRef.current.has(cacheKey) || inFlightRef.current.has(cacheKey)) {
        return;
      }

      inFlightRef.current.add(cacheKey);
      setMasterLoading(`${index}-brands`, true);
      try {
        const brands = await fetchMasterBrands(item.product);
        mastersLoadedRef.current.add(cacheKey);
        setRowMasters((current) => ({
          ...current,
          [index]: {
            products: current[index]?.products ?? [],
            brands,
            models: current[index]?.models ?? [],
          },
        }));
        setSelectedLabels((current) => ({
          ...current,
          [index]: {
            ...current[index],
            brand:
              item.brand_name ||
              brands.find((row) => row.id === item.brand)?.name ||
              current[index]?.brand,
          },
        }));
      } finally {
        inFlightRef.current.delete(cacheKey);
        setMasterLoading(`${index}-brands`, false);
      }
    },
    [items],
  );

  const ensureModelsLoaded = useCallback(
    async (index: number) => {
      const item = items[index];
      if (!item?.brand) return;

      const cacheKey = `${index}:models:${item.brand}`;
      if (mastersLoadedRef.current.has(cacheKey) || inFlightRef.current.has(cacheKey)) {
        return;
      }

      inFlightRef.current.add(cacheKey);
      setMasterLoading(`${index}-models`, true);
      try {
        const models = await fetchMasterModels(item.brand);
        mastersLoadedRef.current.add(cacheKey);
        setRowMasters((current) => ({
          ...current,
          [index]: {
            products: current[index]?.products ?? [],
            brands: current[index]?.brands ?? [],
            models,
          },
        }));
        setSelectedLabels((current) => ({
          ...current,
          [index]: {
            ...current[index],
            model:
              item.model_name ||
              models.find((row) => row.id === item.model)?.name ||
              current[index]?.model,
          },
        }));
      } finally {
        inFlightRef.current.delete(cacheKey);
        setMasterLoading(`${index}-models`, false);
      }
    },
    [items],
  );

  function updateItem(index: number, patch: Partial<LeadItemFormData>) {
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...patch };
      if (patch.category !== undefined && patch.category !== item.category) {
        updated.product = "";
        updated.brand = "";
        updated.model = "";
      }
      if (patch.product !== undefined && patch.product !== item.product) {
        updated.brand = "";
        updated.model = "";
      }
      if (patch.brand !== undefined && patch.brand !== item.brand) {
        updated.model = "";
      }
      return updated;
    });

    if (patch.category !== undefined && patch.category !== items[index]?.category) {
      clearRowMasterCache(index);
      setSelectedLabels((current) => ({
        ...current,
        [index]: {},
      }));
      setRowMasters((current) => ({
        ...current,
        [index]: { products: [], brands: [], models: [] },
      }));
    } else if (patch.product !== undefined && patch.product !== items[index]?.product) {
      clearRowMasterCache(index, ["brands", "models"]);
      setSelectedLabels((current) => ({
        ...current,
        [index]: { ...current[index], brand: "", model: "" },
      }));
      setRowMasters((current) => ({
        ...current,
        [index]: {
          products: current[index]?.products ?? [],
          brands: [],
          models: [],
        },
      }));
    } else if (patch.brand !== undefined && patch.brand !== items[index]?.brand) {
      clearRowMasterCache(index, ["models"]);
      setSelectedLabels((current) => ({
        ...current,
        [index]: { ...current[index], model: "" },
      }));
      setRowMasters((current) => ({
        ...current,
        [index]: {
          products: current[index]?.products ?? [],
          brands: current[index]?.brands ?? [],
          models: [],
        },
      }));
    }

    onChange(next);
  }

  function addItem() {
    onChange([...items, emptyLeadItem()]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  function openAddModal(
    row: number,
    type: "product" | "brand" | "model",
    initialName: string,
  ) {
    setAddModal({ row, type, initialName });
  }

  async function handleAddMaster(name: string) {
    if (!addModal) return;
    const rowIndex = addModal.row;
    const item = items[rowIndex];
    setIsAdding(true);
    try {
      if (addModal.type === "product") {
        const created = await createMasterProduct({
          category: item.category,
          name,
        });
        setRowMasters((current) => {
          const row = current[rowIndex] ?? { products: [], brands: [], models: [] };
          const products = row.products.some((product) => product.id === created.id)
            ? row.products
            : [...row.products, created];
          return {
            ...current,
            [rowIndex]: { ...row, products, brands: [], models: [] },
          };
        });
        setSelectedLabels((current) => ({
          ...current,
          [rowIndex]: { ...current[rowIndex], product: created.name, brand: "", model: "" },
        }));
        onChange(
          items.map((row, index) =>
            index === rowIndex
              ? { ...row, product: created.id, brand: "", model: "" }
              : row,
          ),
        );
      } else if (addModal.type === "brand") {
        const created = await createMasterBrand({
          product: item.product,
          name,
        });
        setRowMasters((current) => {
          const row = current[rowIndex] ?? { products: [], brands: [], models: [] };
          const brands = row.brands.some((brand) => brand.id === created.id)
            ? row.brands
            : [...row.brands, created];
          return {
            ...current,
            [rowIndex]: { ...row, brands, models: [] },
          };
        });
        setSelectedLabels((current) => ({
          ...current,
          [rowIndex]: { ...current[rowIndex], brand: created.name, model: "" },
        }));
        onChange(
          items.map((row, index) =>
            index === rowIndex ? { ...row, brand: created.id, model: "" } : row,
          ),
        );
      } else {
        const created = await createMasterModel({
          brand: item.brand,
          name,
        });
        setRowMasters((current) => {
          const row = current[rowIndex] ?? { products: [], brands: [], models: [] };
          const models = row.models.some((model) => model.id === created.id)
            ? row.models
            : [...row.models, created];
          return {
            ...current,
            [rowIndex]: { ...row, models },
          };
        });
        setSelectedLabels((current) => ({
          ...current,
          [rowIndex]: { ...current[rowIndex], model: created.name },
        }));
        onChange(
          items.map((row, index) =>
            index === rowIndex ? { ...row, model: created.id } : row,
          ),
        );
      }
      setAddModal(null);
    } finally {
      setIsAdding(false);
    }
  }

  function getParentField():
    | { label: string; value: string }
    | undefined {
    if (!addModal) return undefined;
    const item = items[addModal.row];
    if (addModal.type === "product") {
      const category = categories.find((cat) => cat.id === item.category);
      return category
        ? { label: "Category", value: category.name }
        : undefined;
    }
    if (addModal.type === "brand") {
      const product = rowMasters[addModal.row]?.products.find(
        (row) => row.id === item.product,
      );
      return product
        ? { label: "Product", value: product.name }
        : undefined;
    }
    const brand = rowMasters[addModal.row]?.brands.find(
      (row) => row.id === item.brand,
    );
    return brand ? { label: "Brand", value: brand.name } : undefined;
  }

  async function refreshRowMasters() {
    await Promise.all(
      items.map(async (item, index) => {
        if (!item.category) return;
        const [products, brands, models] = await Promise.all([
          fetchMasterProducts(item.category),
          item.product ? fetchMasterBrands(item.product) : Promise.resolve([]),
          item.brand ? fetchMasterModels(item.brand) : Promise.resolve([]),
        ]);
        setRowMasters((current) => ({
          ...current,
          [index]: { products, brands, models },
        }));
      }),
    );
  }

  function handleBulkUploaded(lineItems: ImportedProductLineItem[]) {
    if (!lineItems.length) {
      void refreshRowMasters();
      setIsBulkUploadOpen(false);
      return;
    }

    const importedItems: LeadItemFormData[] = lineItems.map((row) => ({
      category: row.category,
      product: row.product,
      brand: row.brand || "",
      model: row.model || "",
      quantity: String(row.quantity),
      uom: row.uom || "NOS",
      specification: row.specification || "",
      remarks: row.remarks || "",
    }));

    const hasOnlyEmpty =
      items.length === 1 && !items[0].category && !items[0].product;
    const keptItems = hasOnlyEmpty
      ? []
      : items.filter((item) => item.category && item.product);
    const nextItems = [...keptItems, ...importedItems];

    onChange(nextItems.length ? nextItems : [emptyLeadItem()]);

    const startIndex = keptItems.length;
    setRowMasters((current) => {
      const next = { ...current };
      lineItems.forEach((row, offset) => {
        const index = startIndex + offset;
        next[index] = {
          products: [
            {
              id: row.product,
              name: row.product_name,
              category: row.category,
              category_name: row.category_name,
              created_at: "",
              updated_at: "",
            },
          ],
          brands: row.brand
            ? [
                {
                  id: row.brand,
                  name: row.brand_name,
                  product: row.product,
                  product_name: row.product_name,
                  category_name: row.category_name,
                  created_at: "",
                  updated_at: "",
                },
              ]
            : [],
          models: row.model
            ? [
                {
                  id: row.model,
                  name: row.model_name,
                  brand: row.brand,
                  brand_name: row.brand_name,
                  product_name: row.product_name,
                  category_name: row.category_name,
                  created_at: "",
                  updated_at: "",
                },
              ]
            : [],
        };
      });
      return next;
    });

    setSelectedLabels((current) => {
      const next = { ...current };
      lineItems.forEach((row, offset) => {
        const index = startIndex + offset;
        next[index] = {
          product: row.product_name,
          brand: row.brand_name || undefined,
          model: row.model_name || undefined,
        };
      });
      return next;
    });

    setIsBulkUploadOpen(false);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select category and product (brand and model are optional). Search to
            find or add new entries inline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowBulkUpload && (
            <button
              type="button"
              onClick={() => setIsBulkUploadOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Bulk upload
            </button>
          )}
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            + Add Product Line
          </button>
        </div>
      </div>

      {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}

      <div className="space-y-4">
        {items.map((item, index) => {
          const masters = rowMasters[index] ?? {
            products: [],
            brands: [],
            models: [],
          };
          const rowKey = item.id || `row-${index}`;

          return (
            <div
              key={rowKey}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Product {index + 1}
                </p>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <CategorySelectField
                  id={`lead-item-category-${index}`}
                  label="Category"
                  value={item.category ? String(item.category) : ""}
                  onChange={(category) => updateItem(index, { category })}
                  categories={categories}
                  emptyOption={{ value: "", label: "Select category" }}
                  required
                  selectClassName={inputClass}
                />

                <SearchableSelect
                  label="Product"
                  value={item.product ? String(item.product) : ""}
                  valueLabel={selectedLabels[index]?.product}
                  onOpen={() => void ensureProductsLoaded(index)}
                  isLoading={Boolean(loadingMasters[`${index}-products`])}
                  onChange={(product) => {
                    const label = masters.products.find((row) => row.id === product)?.name;
                    setSelectedLabels((current) => ({
                      ...current,
                      [index]: { ...current[index], product: label },
                    }));
                    updateItem(index, { product });
                  }}
                  options={masters.products.map((product) => ({
                    value: product.id,
                    label: product.name,
                  }))}
                  disabled={!item.category}
                  required
                  emptyLabel={
                    item.category ? "Select product" : "Select category first"
                  }
                  placeholder="Search products..."
                  inputClassName={inputClass}
                  canCreate={canCreateMaster && Boolean(item.category)}
                  createLabel={(search) => `Add Product "${search}"`}
                  onCreateRequest={(search) =>
                    openAddModal(index, "product", search)
                  }
                />

                <SearchableSelect
                  label="Brand"
                  value={item.brand ? String(item.brand) : ""}
                  valueLabel={selectedLabels[index]?.brand}
                  onOpen={() => void ensureBrandsLoaded(index)}
                  isLoading={Boolean(loadingMasters[`${index}-brands`])}
                  onChange={(brand) => {
                    const label = masters.brands.find((row) => row.id === brand)?.name;
                    setSelectedLabels((current) => ({
                      ...current,
                      [index]: { ...current[index], brand: label },
                    }));
                    updateItem(index, { brand });
                  }}
                  options={masters.brands.map((brand) => ({
                    value: brand.id,
                    label: brand.name,
                  }))}
                  disabled={!item.product}
                  emptyLabel={
                    item.product ? "Select brand (optional)" : "Select product first"
                  }
                  placeholder="Search brands..."
                  inputClassName={inputClass}
                  canCreate={canCreateMaster && Boolean(item.product)}
                  createLabel={(search) => `Add Brand "${search}"`}
                  onCreateRequest={(search) =>
                    openAddModal(index, "brand", search)
                  }
                />

                <SearchableSelect
                  label="Model"
                  value={item.model ? String(item.model) : ""}
                  valueLabel={selectedLabels[index]?.model}
                  onOpen={() => void ensureModelsLoaded(index)}
                  isLoading={Boolean(loadingMasters[`${index}-models`])}
                  onChange={(model) => {
                    const label = masters.models.find((row) => row.id === model)?.name;
                    setSelectedLabels((current) => ({
                      ...current,
                      [index]: { ...current[index], model: label },
                    }));
                    updateItem(index, { model });
                  }}
                  options={masters.models.map((model) => ({
                    value: model.id,
                    label: model.name,
                  }))}
                  disabled={!item.brand}
                  emptyLabel={
                    item.brand ? "Select model (optional)" : "Select brand first"
                  }
                  placeholder="Search models..."
                  inputClassName={inputClass}
                  canCreate={canCreateMaster && Boolean(item.brand)}
                  createLabel={(search) => `Add Model "${search}"`}
                  onCreateRequest={(search) =>
                    openAddModal(index, "model", search)
                  }
                />

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    UOM
                  </label>
                  <select
                    className={inputClass}
                    value={item.uom || "NOS"}
                    onChange={(e) => updateItem(index, { uom: e.target.value })}
                  >
                    {LEAD_ITEM_UOM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Specification
                  </label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={item.specification}
                    onChange={(e) =>
                      updateItem(index, { specification: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Remarks / Scope
                  </label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={item.remarks}
                    onChange={(e) => updateItem(index, { remarks: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MasterAddModal
        isOpen={addModal !== null}
        isSubmitting={isAdding}
        initialName={addModal?.initialName ?? ""}
        parentField={getParentField()}
        title={
          addModal?.type === "product"
            ? "Add Product"
            : addModal?.type === "brand"
              ? "Add Brand"
              : "Add Model"
        }
        label={
          addModal?.type === "product"
            ? "Product name"
            : addModal?.type === "brand"
              ? "Brand name"
              : "Model name"
        }
        onClose={() => setAddModal(null)}
        onSubmit={handleAddMaster}
      />

      {allowBulkUpload && (
        <ProductBulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onUploaded={handleBulkUploaded}
        />
      )}
    </section>
  );
}
