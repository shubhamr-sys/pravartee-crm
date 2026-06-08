"use client";

import Link from "next/link";

import FollowupBadge from "@/components/leads/FollowupBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Lead } from "@/types/lead";

interface LeadTableProps {
  leads: Lead[];
  canEdit?: boolean;
}

export default function LeadTable({ leads, canEdit = true }: LeadTableProps) {
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
              <th className="px-4 py-3 text-left font-medium text-slate-600">Value</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Follow-up</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
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
                <td className="px-4 py-3 font-medium text-slate-900">
                  {formatCurrency(lead.estimated_value)}
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
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </Link>
                    {canEdit && (
                      <Link
                        href={`/leads/${lead.id}/edit`}
                        className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
