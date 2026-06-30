"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LoadingState, ErrorState } from "@/components/leads/StatusMessage";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  createPricingRequest,
  fetchLeadPricingRequests,
} from "@/lib/pricingService";
import type { PricingRequest, PricingRequestStatus } from "@/types/pricing";

const PRICING_POLL_INTERVAL_MS = 15_000;

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

function hasLineItemPrices(request: PricingRequest): boolean {
  return Boolean(
    request.line_items?.some((item) => item.unit_price != null && item.unit_price !== ""),
  );
}

function legacyPricingPdfUrl(request: PricingRequest): string | null {
  return request.generated_quotation_url || request.vendor_quote_url || null;
}

interface LeadPricingSectionProps {
  leadId: string;
  onPricingReady?: (request: PricingRequest) => void;
  onUpdated?: () => void;
}

export default function LeadPricingSection({
  leadId,
  onPricingReady,
  onUpdated,
}: LeadPricingSectionProps) {
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const statusByRequestRef = useRef<Map<string, PricingRequestStatus>>(new Map());
  const hasInitializedRef = useRef(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await fetchLeadPricingRequests(leadId);
        const prevStatuses = statusByRequestRef.current;
        let shouldNotifyParent = false;

        for (const request of data) {
          const previousStatus = prevStatuses.get(request.id);

          if (
            hasInitializedRef.current &&
            previousStatus === "PENDING" &&
            request.status === "RESPONDED" &&
            hasLineItemPrices(request)
          ) {
            onPricingReady?.(request);
            shouldNotifyParent = true;
          }

          prevStatuses.set(request.id, request.status);
        }

        hasInitializedRef.current = true;
        setRequests(data);

        if (shouldNotifyParent) {
          onUpdated?.();
        }
      } catch {
        if (!options?.silent) {
          setError("Unable to load pricing requests.");
        }
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [leadId, onPricingReady, onUpdated],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasPending = requests.some((request) => request.status === "PENDING");
    if (!hasPending) return;

    const intervalId = window.setInterval(() => {
      void load({ silent: true });
    }, PRICING_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [requests, load]);

  const hasPendingRequest = requests.some((request) => request.status === "PENDING");

  async function handleAskForPrice() {
    setIsSubmitting(true);
    setMessage(null);
    try {
      await createPricingRequest(leadId);
      setMessage("Pricing request sent to Commercial and Purchase teams.");
      await load();
      onUpdated?.();
    } catch {
      setMessage("Unable to create pricing request. Ensure the lead has product lines.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="pricing"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
          <p className="mt-1 text-sm text-slate-500">
            Request pricing from Commercial / Purchase and view submitted prices here.
          </p>
        </div>
        <button
          type="button"
          disabled={isSubmitting || hasPendingRequest}
          title={
            hasPendingRequest ? "Waiting for pricing response" : undefined
          }
          onClick={() => void handleAskForPrice()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Sending..."
            : hasPendingRequest
              ? "Awaiting pricing..."
              : "Ask for Price"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {isLoading && <div className="mt-4"><LoadingState message="Loading pricing..." /></div>}
      {!isLoading && error && (
        <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No pricing requests yet.</p>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <div className="mt-4 space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    request.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {request.status_display}
                </span>
                <span className="text-xs text-slate-500">
                  Requested {formatDateTime(request.requested_at)}
                </span>
                {request.responded_at && (
                  <span className="text-xs text-slate-500">
                    · Responded {formatDateTime(request.responded_at)}
                  </span>
                )}
              </div>

              {request.price_validity && (
                <p className="mt-2 text-sm font-medium text-slate-800">
                  Price validity: {formatDate(request.price_validity)}
                </p>
              )}

              {request.response_remarks && (
                <p className="mt-2 text-sm text-slate-700">{request.response_remarks}</p>
              )}

              {request.status === "RESPONDED" && hasLineItemPrices(request) && (
                <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                  Prices submitted — see line items below.
                </div>
              )}

              {request.status === "RESPONDED" && !hasLineItemPrices(request) && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {legacyPricingPdfUrl(request) ? (
                    <>
                      This response has no unit prices on file. A quotation PDF was uploaded
                      instead.{" "}
                      <a
                        href={legacyPricingPdfUrl(request)!}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-amber-950 underline hover:text-amber-900"
                      >
                        Download pricing PDF
                      </a>
                    </>
                  ) : (
                    <>
                      This response has no unit prices recorded (only remarks were saved).
                      Ask Commercial / Purchase to submit prices again using{" "}
                      <span className="font-medium">Ask for Price</span>.
                    </>
                  )}
                </div>
              )}

              {request.line_items && request.line_items.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Product</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2 pr-4">Unit Price</th>
                        <th className="py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.line_items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="py-2 pr-4">{hierarchyLabel(item)}</td>
                          <td className="py-2 pr-4">{item.quantity}</td>
                          <td className="py-2 pr-4 font-medium text-slate-900">
                            {item.unit_price != null && item.unit_price !== ""
                              ? formatCurrency(item.unit_price)
                              : "—"}
                          </td>
                          <td className="py-2">{item.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
