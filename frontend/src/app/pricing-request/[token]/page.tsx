"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import axios from "axios";

import {
  fetchPublicPricingRequest,
  submitPublicPricing,
} from "@/lib/pricingService";
import PricingSubmitForm from "@/components/pricing/PricingSubmitForm";
import { formatDate } from "@/lib/format";
import type { PublicPricingRequest } from "@/types/pricing";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPublicPricingRequest(token);
        setRequest(data);
      } catch {
        setError("Invalid or expired pricing request link.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [token]);

  async function handleSubmit(payload: {
    response_remarks: string;
    price_validity: string;
    line_items: { lead_item_id: string; unit_price: string; remarks: string }[];
  }) {
    if (!request || request.status === "RESPONDED") return;

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await submitPublicPricing(token, payload);
      setRequest(updated);
      setSuccess("Pricing submitted successfully. The lead owner has been notified.");
    } catch (err) {
      setError(submitErrorMessage(err));
      throw err;
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
          <div className="mt-6 space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {request.price_validity ? (
              <p>
                <span className="font-medium">Price validity:</span>{" "}
                {formatDate(request.price_validity)}
              </p>
            ) : null}
            <p>
              This pricing request has already been submitted and is closed. If you need to send
              updated pricing, ask the sales team to send a new pricing request from the CRM.
            </p>
          </div>
        )}

        {!isResponded && (
          <div className="mt-8">
            <PricingSubmitForm
              lineItems={request.line_items}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
