"use client";

import { formFieldClass } from "@/lib/formStyles";
import type { PricingQueueOwner } from "@/types/pricing";

export type PricingQueueDateOrder = "requested_at" | "-requested_at";

interface PricingQueueFiltersProps {
  search: string;
  assignedTo: string;
  requestedOn: string;
  order: PricingQueueDateOrder;
  owners: PricingQueueOwner[];
  onSearchChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onRequestedOnChange: (value: string) => void;
  onOrderChange: (value: PricingQueueDateOrder) => void;
  onClear: () => void;
}

const ORDER_OPTIONS: { value: PricingQueueDateOrder; label: string }[] = [
  { value: "-requested_at", label: "Requested date: Newest first" },
  { value: "requested_at", label: "Requested date: Oldest first" },
];

export default function PricingQueueFilters({
  search,
  assignedTo,
  requestedOn,
  order,
  owners,
  onSearchChange,
  onAssignedToChange,
  onRequestedOnChange,
  onOrderChange,
  onClear,
}: PricingQueueFiltersProps) {
  const hasActiveFilters = Boolean(search || assignedTo || requestedOn);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
      <div className="xl:col-span-2">
        <label htmlFor="pricing-search" className="mb-1 block text-xs font-medium text-slate-500">
          Project / company name
        </label>
        <input
          id="pricing-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by project or company..."
          className={formFieldClass}
        />
      </div>

      <div>
        <label htmlFor="pricing-owner" className="mb-1 block text-xs font-medium text-slate-500">
          Sales owner
        </label>
        <select
          id="pricing-owner"
          value={assignedTo}
          onChange={(e) => onAssignedToChange(e.target.value)}
          className={formFieldClass}
        >
          <option value="">All owners</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pricing-date" className="mb-1 block text-xs font-medium text-slate-500">
          Requested on (exact date)
        </label>
        <input
          id="pricing-date"
          type="date"
          value={requestedOn}
          onChange={(e) => onRequestedOnChange(e.target.value)}
          className={formFieldClass}
        />
      </div>

      <div>
        <label htmlFor="pricing-order" className="mb-1 block text-xs font-medium text-slate-500">
          Date sort
        </label>
        <select
          id="pricing-order"
          value={order}
          onChange={(e) => onOrderChange(e.target.value as PricingQueueDateOrder)}
          className={formFieldClass}
        >
          {ORDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters ? (
        <div className="flex items-end md:col-span-2 xl:col-span-5">
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
