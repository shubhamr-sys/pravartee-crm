"use client";

import CategoryHelpContent from "@/components/leads/CategoryHelpContent";
import Tooltip from "@/components/ui/Tooltip";
import { getCategoryDescriptionById } from "@/lib/productCategories";
import type { ProductCategory } from "@/types/lead";

interface CategorySelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  categories: ProductCategory[];
  emptyOption?: { value: string; label: string };
  required?: boolean;
  labelClassName?: string;
  selectClassName?: string;
  showSelectedHelper?: boolean;
}

export default function CategorySelectField({
  id,
  label,
  value,
  onChange,
  categories,
  emptyOption,
  required = false,
  labelClassName = "text-xs font-medium text-slate-600",
  selectClassName = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100",
  showSelectedHelper = true,
}: CategorySelectFieldProps) {
  const selectedDescription = showSelectedHelper
    ? getCategoryDescriptionById(value, categories)
    : undefined;

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={id} className={labelClassName}>
          {label}
          {required ? " *" : ""}
        </label>
        <Tooltip
          ariaLabel="Product category descriptions"
          content={<CategoryHelpContent />}
          placement="bottom"
        />
      </div>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
        required={required}
        aria-describedby={selectedDescription ? `${id}-helper` : undefined}
      >
        {emptyOption && (
          <option value={emptyOption.value}>{emptyOption.label}</option>
        )}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {selectedDescription && (
        <p
          id={`${id}-helper`}
          className="mt-1.5 text-xs leading-relaxed text-slate-500"
        >
          {selectedDescription}
        </p>
      )}
    </div>
  );
}
