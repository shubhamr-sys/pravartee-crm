"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import PricingSubmitForm from "@/components/pricing/PricingSubmitForm";
import { ErrorState, LoadingState } from "@/components/leads/StatusMessage";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { pricingHierarchyLabel } from "@/lib/pricingUtils";
import {
  fetchPricingQueueItem,
  submitPricingQueueItem,
} from "@/lib/pricingService";
import type { PricingQueueItem } from "@/types/pricing";

export default function PricingQueueDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccessToast } = useToast();
  const [item, setItem] = useState<PricingQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPricingQueueItem(params.id);
      setItem(data);
    } catch {
      setError("Pricing request not found.");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(payload: {
    response_remarks: string;
    price_validity: string;
    line_items: { lead_item_id: string; unit_price: string; remarks: string }[];
  }) {
    if (!item) return;
    setIsSubmitting(true);
    try {
      const updated = await submitPricingQueueItem(item.id, payload);
      setItem(updated);
      showSuccessToast("Pricing submitted. The sales owner has been notified.");
      router.push("/pricing");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading pricing request..." />;
  }

  if (error || !item) {
    return <ErrorState message={error || "Pricing request not found."} onRetry={() => void load()} />;
  }

  const isPending = item.status === "PENDING";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/pricing" className="text-sm text-teal-700 hover:text-teal-800">
          ← Back to pricing queue
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{item.customer_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {item.company_name || "—"} · {item.stage_name} · {item.status_display}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Requested by</dt>
            <dd className="font-medium">{item.requested_by_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Sales owner</dt>
            <dd className="font-medium">{item.assigned_to_name || "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Requested at</dt>
            <dd className="font-medium">{formatDateTime(item.requested_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Record type</dt>
            <dd className="font-medium">{item.record_type_display}</dd>
          </div>
          {item.address ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Address</dt>
              <dd className="font-medium">{item.address}</dd>
            </div>
          ) : null}
          {item.location_url ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">GPS</dt>
              <dd>
                <a
                  href={item.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 hover:text-teal-800"
                >
                  View on map
                </a>
              </dd>
            </div>
          ) : null}
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
              {item.line_items.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{pricingHierarchyLabel(line)}</td>
                  <td className="px-3 py-2">
                    {line.quantity} {line.uom}
                  </td>
                  <td className="px-3 py-2">{line.specification || "—"}</td>
                  <td className="px-3 py-2">{line.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isPending && item.response_line_items && item.response_line_items.length > 0 ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="text-sm font-semibold text-green-900">Submitted pricing</h3>
            <ul className="mt-2 space-y-2 text-sm text-green-900">
              {item.response_line_items.map((row) => (
                <li key={row.id}>
                  {pricingHierarchyLabel(row)} — {formatCurrency(row.unit_price)}
                  {row.remarks ? ` (${row.remarks})` : ""}
                </li>
              ))}
            </ul>
            {item.price_validity ? (
              <p className="mt-2 text-sm text-green-800">
                <span className="font-medium">Price validity:</span>{" "}
                {formatDate(item.price_validity)}
              </p>
            ) : null}
            {item.response_remarks ? (
              <p className="mt-2 text-sm text-green-800">{item.response_remarks}</p>
            ) : null}
          </div>
        ) : null}

        {isPending ? (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <PricingSubmitForm
              lineItems={item.line_items}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            This pricing request has already been submitted.
          </p>
        )}
      </div>
    </div>
  );
}
