"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";

import LocationDisplay from "@/components/attendance/LocationDisplay";
import LeadDocumentsSection from "@/components/leads/LeadDocumentsSection";
import LeadItemsEditor from "@/components/leads/LeadItemsEditor";
import LeadVisitToggle from "@/components/leads/LeadVisitToggle";
import { useToast } from "@/context/ToastContext";
import { GeolocationError, getCurrentPosition } from "@/lib/geolocation";
import { getValidationToastMessage, parseApiFieldErrors } from "@/lib/formErrors";
import { GUT_FEELING_PERCENT_OPTIONS } from "@/lib/gutFeelingOptions";
import { validateIndianMobile } from "@/lib/phoneValidation";
import {
  getRecordTypeLabel,
  type AssignableUser,
  type LeadDocument,
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
  cancelHref?: string;
  leadId?: string;
  initialDocuments?: LeadDocument[];
  onSubmit: (values: LeadFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

function fieldClass(hasError: boolean): string {
  return hasError
    ? `${inputClass} border-red-500 focus:border-red-500 focus:ring-red-100`
    : inputClass;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

function formatGpsCoordinate(value: number): string {
  return value.toFixed(6);
}

function gutFeelingSelectValue(value: LeadFormData["gut_feeling_percent"]): string {
  if (value === "" || value == null) return "";
  return String(value);
}

function selectIdValue(value: string | undefined | null): string {
  return value ? String(value) : "";
}

export default function LeadForm({
  mode,
  initialValues,
  stages,
  categories,
  assignableUsers = [],
  canAssign = false,
  isSubmitting = false,
  cancelHref,
  leadId,
  initialDocuments = [],
  onSubmit,
}: LeadFormProps) {
  const { showErrorToast } = useToast();
  const [values, setValues] = useState<LeadFormData>(initialValues);
  const [documents, setDocuments] = useState<LeadDocument[]>(initialDocuments);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  function updateField<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as string] && !current._form) {
        return current;
      }
      const next = { ...current };
      delete next[key as string];
      delete next._form;
      if (key === "items") {
        delete next.items;
      }
      return next;
    });
  }

  async function handleCaptureGps() {
    setIsCapturingGps(true);
    setGpsError(null);
    try {
      const position = await getCurrentPosition();
      updateField("latitude", formatGpsCoordinate(position.latitude));
      updateField("longitude", formatGpsCoordinate(position.longitude));
    } catch (err) {
      setGpsError(
        err instanceof GeolocationError
          ? err.message.replace("punch attendance", "capture location")
          : "Unable to capture GPS location.",
      );
    } finally {
      setIsCapturingGps(false);
    }
  }

  function clearGps() {
    updateField("latitude", "");
    updateField("longitude", "");
    setGpsError(null);
  }

  const hasGps = Boolean(values.latitude && values.longitude);

  function collectValidationErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (mode === "create" && !values.customer_name.trim()) {
      errors.customer_name = "Project name is required.";
    }
    if (mode === "create" && !values.company_name.trim()) {
      errors.company_name = "Company name is required.";
    }
    if (!values.stage) {
      errors.stage = "Stage is required.";
    }
    if (!values.contact_person.trim()) {
      errors.contact_person = "Contact person is required.";
    }
    const phoneError = validateIndianMobile(values.phone);
    if (phoneError) {
      errors.phone = phoneError;
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

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = collectValidationErrors();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showErrorToast(getValidationToastMessage(errors));
      return;
    }

    setFieldErrors({});
    try {
      await onSubmit(values);
    } catch (error) {
      if (isAxiosError(error)) {
        const apiErrors = parseApiFieldErrors(error.response?.data);
        if (Object.keys(apiErrors).length > 0) {
          setFieldErrors(apiErrors);
          showErrorToast(getValidationToastMessage(apiErrors));
          return;
        }
        const detail = error.response?.data?.detail;
        const message =
          typeof detail === "string" ? detail : "Unable to save lead. Please try again.";
        showErrorToast(message);
        return;
      }
      showErrorToast("Unable to save lead. Please try again.");
    }
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

      {fieldErrors._form && (
        <p className="text-sm text-red-600">{fieldErrors._form}</p>
      )}

      {mode === "create" && (
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Project Name *</label>
            <input
              className={fieldClass(Boolean(fieldErrors.customer_name))}
              value={values.customer_name}
              onChange={(e) => updateField("customer_name", e.target.value)}
            />
            <FieldError message={fieldErrors.customer_name} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Company Name *</label>
            <input
              className={fieldClass(Boolean(fieldErrors.company_name))}
              value={values.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
            />
            <FieldError message={fieldErrors.company_name} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contact Person *</label>
            <input
              className={fieldClass(Boolean(fieldErrors.contact_person))}
              value={values.contact_person}
              onChange={(e) => updateField("contact_person", e.target.value)}
            />
            <FieldError message={fieldErrors.contact_person} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mobile *</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              className={fieldClass(Boolean(fieldErrors.phone))}
              value={values.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <FieldError message={fieldErrors.phone} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className={fieldClass(Boolean(fieldErrors.email))}
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <FieldError message={fieldErrors.email} />
          </div>
        </section>
      )}

      {mode === "edit" && (
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Contact Person *</label>
            <input
              className={fieldClass(Boolean(fieldErrors.contact_person))}
              value={values.contact_person}
              onChange={(e) => updateField("contact_person", e.target.value)}
            />
            <FieldError message={fieldErrors.contact_person} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mobile *</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              className={fieldClass(Boolean(fieldErrors.phone))}
              value={values.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <FieldError message={fieldErrors.phone} />
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Address</label>
          <textarea
            rows={3}
            className={inputClass}
            placeholder="Street, city, state, pin code"
            value={values.address}
            onChange={(e) => updateField("address", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">GPS Location</label>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              {hasGps ? (
                <p>
                  Captured: {Number(values.latitude).toFixed(6)},{" "}
                  {Number(values.longitude).toFixed(6)}
                </p>
              ) : (
                <p className="text-slate-500">No GPS location added yet.</p>
              )}
              {hasGps && (
                <div className="mt-1">
                  <LocationDisplay
                    latitude={values.latitude}
                    longitude={values.longitude}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCaptureGps()}
                disabled={isCapturingGps || isSubmitting}
                className="rounded-lg border border-teal-700 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60"
              >
                {isCapturingGps ? "Capturing..." : "Add GPS location"}
              </button>
              {hasGps && (
                <button
                  type="button"
                  onClick={clearGps}
                  disabled={isCapturingGps || isSubmitting}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {gpsError && <p className="mt-1 text-sm text-red-600">{gpsError}</p>}
        </div>
      </section>

      <LeadItemsEditor
        items={values.items}
        categories={categories}
        onChange={(items) => updateField("items", items)}
        errors={fieldErrors}
        allowBulkUpload={mode === "create"}
      />

      <LeadDocumentsSection
        leadId={leadId}
        items={values.items}
        categories={categories}
        documents={documents}
        pendingDocuments={values.pendingDocuments}
        disabled={isSubmitting}
        onDocumentsChange={setDocuments}
        onPendingDocumentsChange={(files) => updateField("pendingDocuments", files)}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Stage *</label>
          <select
            className={fieldClass(Boolean(fieldErrors.stage))}
            value={selectIdValue(values.stage)}
            onChange={(e) => updateField("stage", e.target.value)}
          >
            <option value="">Select stage</option>
            {stages.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.stage} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Gut Feeling</label>
          <select
            className={inputClass}
            value={gutFeelingSelectValue(values.gut_feeling_percent)}
            onChange={(e) =>
              updateField(
                "gut_feeling_percent",
                e.target.value ? Number(e.target.value) : "",
              )
            }
          >
            <option value="">Not set</option>
            {GUT_FEELING_PERCENT_OPTIONS.map((percent) => (
              <option key={percent} value={String(percent)}>
                {percent}%
              </option>
            ))}
          </select>
        </div>

        {canAssign && (
          <div>
            <label className="mb-1 block text-sm font-medium">Assigned To</label>
            <select
              className={inputClass}
              value={selectIdValue(values.assigned_to)}
              onChange={(e) => updateField("assigned_to", e.target.value)}
            >
              <option value="">Unassigned</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={String(user.id)}>
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
