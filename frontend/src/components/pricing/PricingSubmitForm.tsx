"use client";

import { useState } from "react";
import { isAxiosError } from "axios";

import { pricingHierarchyLabel } from "@/lib/pricingUtils";
import type { ManualPricingLineInput, PricingLeadLineItem } from "@/types/pricing";

function submitErrorMessage(err: unknown): string {
  if (!isAxiosError(err) || !err.response?.data) {
    return "Unable to submit pricing. Please check your inputs and try again.";
  }
  const body = err.response.data as Record<string, unknown>;
  if (typeof body.detail === "string") {
    return body.detail;
  }
  const parts: string[] = [];
  for (const [field, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      parts.push(`${field}: ${value.join(", ")}`);
    }
  }
  return parts.length > 0
    ? parts.join(" ")
    : "Unable to submit pricing. Please check your inputs and try again.";
}

interface PricingSubmitFormProps {
  lineItems: PricingLeadLineItem[];
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (payload: {
    response_remarks: string;
    price_validity: string;
    line_items: ManualPricingLineInput[];
  }) => Promise<void>;
}

export default function PricingSubmitForm({
  lineItems,
  disabled = false,
  isSubmitting = false,
  onSubmit,
}: PricingSubmitFormProps) {
  const [responseRemarks, setResponseRemarks] = useState("");
  const [priceValidity, setPriceValidity] = useState("");
  const [lineInputs, setLineInputs] = useState<Record<string, ManualPricingLineInput>>(() => {
    const initial: Record<string, ManualPricingLineInput> = {};
    for (const item of lineItems) {
      initial[item.id] = {
        lead_item_id: item.id,
        unit_price: "",
        remarks: "",
      };
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled) return;

    const missingPrices = lineItems.filter(
      (item) => !lineInputs[item.id]?.unit_price?.trim(),
    );
    if (missingPrices.length > 0) {
      setError("Enter a unit price for every product line.");
      return;
    }
    if (!priceValidity.trim()) {
      setError("Price validity date is required.");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        response_remarks: responseRemarks,
        price_validity: priceValidity,
        line_items: Object.values(lineInputs),
      });
    } catch (err) {
      setError(submitErrorMessage(err));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-medium text-slate-700">Unit prices *</h3>
        <p className="mt-1 text-sm text-slate-500">
          Enter the unit price for every product line below.
        </p>
        <div className="mt-3 space-y-3">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3"
            >
              <p className="text-sm font-medium sm:col-span-3">
                {pricingHierarchyLabel(item)} × {item.quantity} {item.uom}
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                disabled={disabled || isSubmitting}
                placeholder="Unit price *"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={lineInputs[item.id]?.unit_price ?? ""}
                onChange={(e) =>
                  setLineInputs((prev) => ({
                    ...prev,
                    [item.id]: {
                      ...prev[item.id],
                      lead_item_id: item.id,
                      unit_price: e.target.value,
                    },
                  }))
                }
              />
              <input
                type="text"
                disabled={disabled || isSubmitting}
                placeholder="Line remarks"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                value={lineInputs[item.id]?.remarks ?? ""}
                onChange={(e) =>
                  setLineInputs((prev) => ({
                    ...prev,
                    [item.id]: {
                      ...prev[item.id],
                      lead_item_id: item.id,
                      remarks: e.target.value,
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Price validity *
        </label>
        <p className="mt-1 text-sm text-slate-500">
          Date until which the quoted prices remain valid.
        </p>
        <input
          type="date"
          required
          disabled={disabled || isSubmitting}
          className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={priceValidity}
          onChange={(e) => setPriceValidity(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Response remarks</label>
        <textarea
          rows={3}
          disabled={disabled || isSubmitting}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={responseRemarks}
          onChange={(e) => setResponseRemarks(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit pricing"}
      </button>
    </form>
  );
}
