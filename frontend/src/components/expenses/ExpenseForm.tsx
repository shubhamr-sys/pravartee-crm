"use client";

import { useState } from "react";

import { formFieldClass, formLabelClass } from "@/lib/formStyles";
import { EXPENSE_CATEGORY_OPTIONS, type ExpenseFormData } from "@/types/expense";
import type { Lead } from "@/types/lead";

interface ExpenseFormProps {
  leads: Lead[];
  isSubmitting: boolean;
  onSubmit: (values: ExpenseFormData) => Promise<void>;
}

function getLocalToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const EMPTY_FORM: ExpenseFormData = {
  category: "TRAVEL",
  amount: "",
  expense_date: getLocalToday(),
  description: "",
  lead: "",
  receipt: null,
};

export default function ExpenseForm({ leads, isSubmitting, onSubmit }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!values.amount.trim() || Number(values.amount) <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    try {
      await onSubmit(values);
      setValues({ ...EMPTY_FORM, expense_date: getLocalToday() });
    } catch {
      setError("Unable to submit expense. Check the details and try again.");
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Submit expense</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add a travel, food, or other field expense for approval.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="expense-form-category" className={formLabelClass}>
            Category
          </label>
          <select
            id="expense-form-category"
            value={values.category}
            onChange={(e) =>
              setValues((current) => ({
                ...current,
                category: e.target.value as ExpenseFormData["category"],
              }))
            }
            className={formFieldClass}
          >
            {EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expense-form-amount" className={formLabelClass}>
            Amount (INR)
          </label>
          <input
            id="expense-form-amount"
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(e) => setValues((current) => ({ ...current, amount: e.target.value }))}
            className={formFieldClass}
            required
          />
        </div>

        <div>
          <label htmlFor="expense-form-date" className={formLabelClass}>
            Expense date
          </label>
          <input
            id="expense-form-date"
            type="date"
            value={values.expense_date}
            onChange={(e) =>
              setValues((current) => ({ ...current, expense_date: e.target.value }))
            }
            className={formFieldClass}
            required
          />
        </div>

        <div>
          <label htmlFor="expense-form-lead" className={formLabelClass}>
            Related project (optional)
          </label>
          <select
            id="expense-form-lead"
            value={values.lead}
            onChange={(e) => setValues((current) => ({ ...current, lead: e.target.value }))}
            className={formFieldClass}
          >
            <option value="">No project linked</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.customer_name}
                {lead.company_name ? ` — ${lead.company_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="expense-form-description" className={formLabelClass}>
            Description
          </label>
          <textarea
            id="expense-form-description"
            value={values.description}
            onChange={(e) =>
              setValues((current) => ({ ...current, description: e.target.value }))
            }
            rows={3}
            className={formFieldClass}
            placeholder="What was this expense for?"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="expense-form-receipt" className={formLabelClass}>
            Receipt (optional)
          </label>
          <input
            id="expense-form-receipt"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) =>
              setValues((current) => ({
                ...current,
                receipt: e.target.files?.[0] ?? null,
              }))
            }
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit expense"}
        </button>
      </div>
    </form>
  );
}
