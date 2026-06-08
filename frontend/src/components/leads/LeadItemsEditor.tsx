"use client";

import {
  calculateItemsTotal,
  calculateLineTotal,
  emptyLeadItem,
  type LeadItemFormData,
  type ProductCategory,
} from "@/types/lead";
import CategorySelectField from "@/components/leads/CategorySelectField";
import { formatCurrency } from "@/lib/format";
import { LEAD_ITEM_UOM_OPTIONS } from "@/lib/leadItemUom";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

interface LeadItemsEditorProps {
  items: LeadItemFormData[];
  categories: ProductCategory[];
  onChange: (items: LeadItemFormData[]) => void;
  errors?: Record<string, string>;
}

export default function LeadItemsEditor({
  items,
  categories,
  onChange,
  errors = {},
}: LeadItemsEditorProps) {
  const defaultCategory = categories[0]?.id || "";

  function updateItem(index: number, patch: Partial<LeadItemFormData>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    onChange([...items, emptyLeadItem(defaultCategory)]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  const grandTotal = calculateItemsTotal(items);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add one or more products. Estimated value is calculated from line totals.
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          + Add Product
        </button>
      </div>

      {errors.items && (
        <p className="text-sm text-red-600">{errors.items}</p>
      )}

      <div className="space-y-4">
        {items.map((item, index) => {
          const lineTotal = calculateLineTotal(item.quantity, item.unit_price);
          const rowKey = item.id || `row-${index}`;

          return (
            <div
              key={rowKey}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Product {index + 1}</p>
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
                  value={item.category}
                  onChange={(category) => updateItem(index, { category })}
                  categories={categories}
                  emptyOption={{ value: "", label: "Select category" }}
                  required
                  selectClassName={inputClass}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Product *
                  </label>
                  <input
                    className={inputClass}
                    value={item.product}
                    onChange={(e) => updateItem(index, { product: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Brand
                  </label>
                  <input
                    className={inputClass}
                    value={item.brand}
                    onChange={(e) => updateItem(index, { brand: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Model
                  </label>
                  <input
                    className={inputClass}
                    value={item.model}
                    onChange={(e) => updateItem(index, { model: e.target.value })}
                  />
                </div>
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                  />
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
                    placeholder="Delivery scope, exclusions, or other notes for this line item"
                  />
                </div>
              </div>

              <p className="mt-3 text-right text-sm text-slate-600">
                Line total:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(lineTotal)}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
        <span className="text-sm text-teal-800">Estimated Value: </span>
        <span className="text-lg font-semibold text-teal-900">
          {formatCurrency(grandTotal)}
        </span>
      </div>
    </section>
  );
}
