"use client";

import { FormEvent, useState } from "react";

import type { AssignableUser, LeadFormData, LeadStage, ProductCategory } from "@/types/lead";

interface LeadFormProps {
  mode: "create" | "edit";
  initialValues: LeadFormData;
  stages: LeadStage[];
  categories: ProductCategory[];
  assignableUsers?: AssignableUser[];
  canAssign?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: LeadFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function LeadForm({
  mode,
  initialValues,
  stages,
  categories,
  assignableUsers = [],
  canAssign = false,
  isSubmitting = false,
  error,
  onSubmit,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormData>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function updateField<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (mode === "create" && !values.customer_name.trim()) {
      errors.customer_name = "Customer name is required.";
    }
    if (mode === "create" && !values.category) {
      errors.category = "Category is required.";
    }
    if (!values.stage) {
      errors.stage = "Stage is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "create" && (
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Customer Name *</label>
            <input
              className={inputClass}
              value={values.customer_name}
              onChange={(e) => updateField("customer_name", e.target.value)}
            />
            {fieldErrors.customer_name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.customer_name}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Company Name</label>
            <input
              className={inputClass}
              value={values.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contact Person</label>
            <input
              className={inputClass}
              value={values.contact_person}
              onChange={(e) => updateField("contact_person", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              className={inputClass}
              value={values.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className={inputClass}
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estimated Value</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={values.estimated_value}
              onChange={(e) => updateField("estimated_value", e.target.value)}
            />
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {mode === "create" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Category *</label>
              <select
                className={inputClass}
                value={values.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.category}</p>
              )}
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Stage *</label>
          <select
            className={inputClass}
            value={values.stage}
            onChange={(e) => updateField("stage", e.target.value)}
          >
            <option value="">Select stage</option>
            {stages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {fieldErrors.stage && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.stage}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Next Follow-up</label>
          <input
            type="date"
            className={inputClass}
            value={values.next_followup_date}
            onChange={(e) => updateField("next_followup_date", e.target.value)}
          />
        </div>

        {canAssign && (
          <div>
            <label className="mb-1 block text-sm font-medium">Assigned To</label>
            <select
              className={inputClass}
              value={values.assigned_to || ""}
              onChange={(e) => updateField("assigned_to", e.target.value)}
            >
              <option value="">Unassigned</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          rows={4}
          className={inputClass}
          value={values.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create Lead"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
