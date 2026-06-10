"use client";

import CategorySelectField from "@/components/leads/CategorySelectField";
import type { AssignableUser, LeadStage, ProductCategory } from "@/types/lead";

interface LeadFiltersProps {
  search: string;
  stage: string;
  category: string;
  assignedTo: string;
  followupFrom: string;
  followupTo: string;
  ordering: string;
  stages: LeadStage[];
  categories: ProductCategory[];
  assignableUsers?: AssignableUser[];
  showAssigneeFilter?: boolean;
  onSearchChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onFollowupFromChange: (value: string) => void;
  onFollowupToChange: (value: string) => void;
  onOrderingChange: (value: string) => void;
}

const ORDER_OPTIONS = [
  { value: "-updated_at", label: "Recently updated" },
  { value: "customer_name", label: "Customer A–Z" },
  { value: "-customer_name", label: "Customer Z–A" },
  { value: "next_followup_date", label: "Follow-up: Soonest" },
  { value: "-next_followup_date", label: "Follow-up: Latest" },
];

const selectClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function LeadFilters({
  search,
  stage,
  category,
  assignedTo,
  followupFrom,
  followupTo,
  ordering,
  stages,
  categories,
  assignableUsers = [],
  showAssigneeFilter = false,
  onSearchChange,
  onStageChange,
  onCategoryChange,
  onAssignedToChange,
  onFollowupFromChange,
  onFollowupToChange,
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
          className={selectClass}
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
          className={selectClass}
        >
          <option value="">All stages</option>
          {stages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <CategorySelectField
        id="lead-category"
        label="Category"
        value={category}
        onChange={onCategoryChange}
        categories={categories}
        emptyOption={{ value: "", label: "All categories" }}
        labelClassName="text-xs font-medium text-slate-500"
        selectClassName={selectClass}
      />

      {showAssigneeFilter && (
        <div>
          <label htmlFor="lead-assignee" className="mb-1 block text-xs font-medium text-slate-500">
            Assigned To
          </label>
          <select
            id="lead-assignee"
            value={assignedTo}
            onChange={(e) => onAssignedToChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All assignees</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="followup-from" className="mb-1 block text-xs font-medium text-slate-500">
          Follow-up From
        </label>
        <input
          id="followup-from"
          type="date"
          value={followupFrom}
          onChange={(e) => onFollowupFromChange(e.target.value)}
          className={selectClass}
        />
      </div>

      <div>
        <label htmlFor="followup-to" className="mb-1 block text-xs font-medium text-slate-500">
          Follow-up To
        </label>
        <input
          id="followup-to"
          type="date"
          value={followupTo}
          onChange={(e) => onFollowupToChange(e.target.value)}
          className={selectClass}
        />
      </div>

      <div className="md:col-span-2 xl:col-span-4">
        <label htmlFor="lead-ordering" className="mb-1 block text-xs font-medium text-slate-500">
          Sort by
        </label>
        <select
          id="lead-ordering"
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value)}
          className={`${selectClass} md:max-w-sm`}
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
