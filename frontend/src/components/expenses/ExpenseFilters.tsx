"use client";

import { formFieldClass } from "@/lib/formStyles";
import { EXPENSE_CATEGORY_OPTIONS, type ExpenseCategory } from "@/types/expense";
import type { AssignableUser } from "@/types/lead";

interface ExpenseFiltersProps {
  category: ExpenseCategory | "";
  expenseDate: string;
  submittedBy: string;
  search: string;
  users: AssignableUser[];
  showUserFilter: boolean;
  onCategoryChange: (value: ExpenseCategory | "") => void;
  onExpenseDateChange: (value: string) => void;
  onSubmittedByChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export default function ExpenseFilters({
  category,
  expenseDate,
  submittedBy,
  search,
  users,
  showUserFilter,
  onCategoryChange,
  onExpenseDateChange,
  onSubmittedByChange,
  onSearchChange,
  onClear,
}: ExpenseFiltersProps) {
  const hasActiveFilters = Boolean(category || expenseDate || submittedBy || search);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
      <div className="xl:col-span-2">
        <label htmlFor="expense-search" className="mb-1 block text-xs font-medium text-slate-500">
          Search
        </label>
        <input
          id="expense-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Description, project, company..."
          className={formFieldClass}
        />
      </div>

      <div>
        <label htmlFor="expense-category" className="mb-1 block text-xs font-medium text-slate-500">
          Category
        </label>
        <select
          id="expense-category"
          value={category}
          onChange={(e) =>
            onCategoryChange(e.target.value as ExpenseCategory | "")
          }
          className={formFieldClass}
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="expense-date" className="mb-1 block text-xs font-medium text-slate-500">
          Expense date
        </label>
        <input
          id="expense-date"
          type="date"
          value={expenseDate}
          onChange={(e) => onExpenseDateChange(e.target.value)}
          className={formFieldClass}
        />
      </div>

      {showUserFilter ? (
        <div>
          <label htmlFor="expense-user" className="mb-1 block text-xs font-medium text-slate-500">
            Submitted by
          </label>
          <select
            id="expense-user"
            value={submittedBy}
            onChange={(e) => onSubmittedByChange(e.target.value)}
            className={formFieldClass}
          >
            <option value="">All users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
