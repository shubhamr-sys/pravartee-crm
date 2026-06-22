"use client";

import Link from "next/link";
import { useState } from "react";

import FollowupBadge from "@/components/leads/FollowupBadge";
import { formatDate } from "@/lib/format";
import { askForPrice } from "@/lib/leadsService";
import type { Lead } from "@/types/lead";

interface LeadTableProps {
  leads: Lead[];
  canEdit?: boolean;
  onPricingRequested?: (leadId: string) => void;
}

export default function LeadTable({
  leads,
  canEdit = true,
  onPricingRequested,
}: LeadTableProps) {
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(
    null,
  );

  async function handleAskForPrice(lead: Lead) {
    setRequestingId(lead.id);
    setFeedback(null);
    try {
      const response = await askForPrice(lead.id);
      setFeedback({ id: lead.id, message: response.message });
      onPricingRequested?.(lead.id);
    } catch {
      setFeedback({ id: lead.id, message: "Unable to submit price request." });
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Products</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Follow-up</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const isAwaitingPricing = Boolean(lead.has_pending_pricing_request);
              const isSending = requestingId === lead.id;

              return (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-teal-700 hover:text-teal-800"
                  >
                    {lead.customer_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {lead.company_name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {lead.stage_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {lead.category_name || "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {lead.assigned_to_name || "Unassigned"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {lead.items?.length ?? 0} line{(lead.items?.length ?? 0) === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-700">
                      {formatDate(lead.next_followup_date)}
                    </span>
                    <FollowupBadge
                      followupDate={lead.next_followup_date}
                      status={lead.followup_status}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </Link>
                      {lead.has_pricing_response && (
                        <Link
                          href={`/leads/${lead.id}#pricing`}
                          className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                        >
                          View pricing
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleAskForPrice(lead)}
                        disabled={isSending || isAwaitingPricing}
                        title={
                          isAwaitingPricing
                            ? "Waiting for pricing response"
                            : undefined
                        }
                        className="rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSending
                          ? "Sending..."
                          : isAwaitingPricing
                            ? "Awaiting pricing..."
                            : "Ask for price"}
                      </button>
                      {canEdit && (
                        <Link
                          href={`/leads/${lead.id}/edit`}
                          className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                    {feedback?.id === lead.id && (
                      <p
                        className={`text-xs ${
                          feedback.message.includes("Unable")
                            ? "text-red-600"
                            : "text-green-700"
                        }`}
                      >
                        {feedback.message}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
