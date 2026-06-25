"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import axios from "axios";

import {
  fetchPublicPricingRequest,
  submitPublicPricing,
} from "@/lib/pricingService";
import type { ManualPricingLineInput, PublicPricingRequest } from "@/types/pricing";

function submitErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err) || !err.response?.data) {
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
    } else if (typeof value === "object" && value !== null) {
      for (const [idx, messages] of Object.entries(value as Record<string, unknown>)) {
        if (Array.isArray(messages)) {
          parts.push(`${field}[${idx}]: ${messages.join(", ")}`);
        }
      }
    }
  }
  return parts.length > 0
    ? parts.join(" ")
    : "Unable to submit pricing. Please check your inputs and try again.";
}

function hierarchyLabel(item: {
  category_name: string;
  product_name: string;
  brand_name: string | null;
  model_name: string | null;
}) {
  return [item.category_name, item.product_name, item.brand_name, item.model_name]
    .filter(Boolean)
    .join(" → ");
}

export default function PublicPricingRequestPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [request, setRequest] = useState<PublicPricingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseRemarks, setResponseRemarks] = useState("");
  const [vendorPdf, setVendorPdf] = useState<File | null>(null);
  const [lineInputs, setLineInputs] = useState<Record<string, ManualPricingLineInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPublicPricingRequest(token);
        setRequest(data);
        const initial: Record<string, ManualPricingLineInput> = {};
        for (const item of data.line_items) {
          initial[item.id] = {
            lead_item_id: item.id,
            unit_price: "",
            remarks: "",
          };
        }
        setLineInputs(initial);
      } catch {
        setError("Invalid or expired pricing request link.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request || request.status === "RESPONDED") return;

    const line_items = Object.values(lineInputs).filter((row) => row.unit_price.trim());
    if (!vendorPdf && line_items.length === 0) {
      setError("Upload a vendor PDF or enter at least one unit price.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await submitPublicPricing(token, {
        response_remarks: responseRemarks,
        vendor_quote_pdf: vendorPdf,
        line_items,
      });
      setRequest(updated);
      setSuccess("Pricing submitted successfully. The lead owner has been notified.");
    } catch (err) {
      setError(submitErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading pricing request...</p>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!request) return null;

  const isResponded = request.status === "RESPONDED";

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Pricing Submission</h1>
        <p className="mt-1 text-sm text-slate-500">Pravartee CRM — secure vendor portal</p>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Project</dt>
            <dd className="font-medium">{request.customer_name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Company</dt>
            <dd className="font-medium">{request.company_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Stage</dt>
            <dd className="font-medium">{request.stage_name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium">{request.status_display}</dd>
          </div>
        </dl>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Specification</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {request.line_items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{hierarchyLabel(item)}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{item.specification || "—"}</td>
                  <td className="px-3 py-2">{item.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {success && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        {error && request && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isResponded && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            This pricing request has already been submitted and is closed. If you need to send
            updated pricing, ask the sales team to send a new pricing request from the CRM.
          </div>
        )}

        {!isResponded && (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Vendor Quotation PDF
              </label>
              <input
                type="file"
                accept="application/pdf"
                className="mt-2 block w-full text-sm"
                onChange={(e) => setVendorPdf(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-700">Manual pricing (optional)</h3>
              <div className="mt-3 space-y-3">
                {request.line_items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3"
                  >
                    <p className="text-sm font-medium sm:col-span-3">
                      {hierarchyLabel(item)} × {item.quantity}
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
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
              <label className="block text-sm font-medium text-slate-700">Response remarks</label>
              <textarea
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={responseRemarks}
                onChange={(e) => setResponseRemarks(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Pricing"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
