"use client";

import type { LeadStage, ProductCategory } from "@/types/lead";

interface LeadFiltersProps {
  search: string;
  stage: string;
  category: string;
  ordering: string;
  stages: LeadStage[];
  categories: ProductCategory[];
  onSearchChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onOrderingChange: (value: string) => void;
}

const ORDER_OPTIONS = [
  { value: "-updated_at", label: "Recently updated" },
  { value: "customer_name", label: "Customer A–Z" },
  { value: "-customer_name", label: "Customer Z–A" },
  { value: "-estimated_value", label: "Value: High to low" },
  { value: "estimated_value", label: "Value: Low to high" },
  { value: "next_followup_date", label: "Follow-up: Soonest" },
  { value: "-next_followup_date", label: "Follow-up: Latest" },
];

export default function LeadFilters({
  search,
  stage,
  category,
  ordering,
  stages,
  categories,
  onSearchChange,
  onStageChange,
  onCategoryChange,
  onOrderingChange,
}: LeadFiltersProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <div className="xl:col-span-2">
        <label htmlFor="lead-search" className="mb-1 block text-xs font-medium text-slate-500">
          Search
        </label>
        <input
          id="lead-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Customer, company, phone, email..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label htmlFor="lead-stage" className="mb-1 block text-xs font-medium text-slate-500">
          Stage
        </label>
        <select
          id="lead-stage"
          value={stage}
          onChange={(e) => onStageChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">All stages</option>
          {stages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="lead-category" className="mb-1 block text-xs font-medium text-slate-500">
          Category
        </label>
        <select
          id="lead-category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 xl:col-span-4">
        <label htmlFor="lead-ordering" className="mb-1 block text-xs font-medium text-slate-500">
          Sort by
        </label>
        <select
          id="lead-ordering"
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 md:max-w-sm"
        >
          {ORDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
