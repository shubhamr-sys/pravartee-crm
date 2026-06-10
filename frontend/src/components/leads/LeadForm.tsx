"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import LeadItemsEditor from "@/components/leads/LeadItemsEditor";
import LeadVisitToggle from "@/components/leads/LeadVisitToggle";
import {
  getRecordTypeLabel,
  type AssignableUser,
  type LeadFormData,
  type LeadRecordType,
  type LeadStage,
  type ProductCategory,
} from "@/types/lead";

interface LeadFormProps {
  mode: "create" | "edit";
  initialValues: LeadFormData;
  stages: LeadStage[];
  categories: ProductCategory[];
  assignableUsers?: AssignableUser[];
  canAssign?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  cancelHref?: string;
  onSubmit: (values: LeadFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const PHONE_PATTERN = /^[\d\s+\-().]{7,20}$/;

export default function LeadForm({
  mode,
  initialValues,
  stages,
  categories,
  assignableUsers = [],
  canAssign = false,
  isSubmitting = false,
  error,
  cancelHref,
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
    if (mode === "create" && !values.company_name.trim()) {
      errors.company_name = "Company name is required.";
    }
    if (!values.stage) {
      errors.stage = "Stage is required.";
    }
    if (values.phone && !PHONE_PATTERN.test(values.phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = "Enter a valid email address.";
    }

    const hasValidItems = values.items.some(
      (item) =>
        item.category && item.product && Number(item.quantity) >= 1,
    );
    if (!hasValidItems) {
      errors.items =
        "Add at least one complete product line (category, product, quantity).";
    }

    for (const item of values.items) {
      if (item.category || item.product || item.brand || item.model) {
        if (!item.category || !item.product) {
          errors.items = "Each line must have category and product selected.";
          break;
        }
        if (item.model && !item.brand) {
          errors.items = "Select a brand before selecting a model.";
          break;
        }
        const qty = Number(item.quantity);
        if (Number.isNaN(qty) || qty < 1) {
          errors.items = "Quantity must be at least 1 for each product.";
          break;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  }

  const recordType = values.record_type || "LEAD";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-700">Record type</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Choose whether you are logging a {getRecordTypeLabel(recordType).toLowerCase()}.
          </p>
        </div>
        <LeadVisitToggle
          value={recordType}
          onChange={(next: LeadRecordType) => updateField("record_type", next)}
        />
      </div>

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
            <label className="mb-1 block text-sm font-medium">Company Name *</label>
            <input
              className={inputClass}
              value={values.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
            />
            {fieldErrors.company_name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</p>
            )}
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
            {fieldErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className={inputClass}
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
        </section>
      )}

      <LeadItemsEditor
        items={values.items}
        categories={categories}
        onChange={(items) => updateField("items", items)}
        errors={fieldErrors}
      />

      <section className="grid gap-4 md:grid-cols-2">
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

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? `Create ${getRecordTypeLabel(recordType)}`
              : "Save Changes"}
        </button>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
