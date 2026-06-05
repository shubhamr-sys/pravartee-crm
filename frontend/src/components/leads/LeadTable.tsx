"use client";

import Link from "next/link";

import { formatCurrency, formatDate } from "@/lib/format";
import type { Lead } from "@/types/lead";

interface LeadTableProps {
  leads: Lead[];
}

export default function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Value</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Follow-up</th>
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
                  {lead.assigned_to_name || "Unassigned"}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {formatCurrency(lead.estimated_value)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDate(lead.next_followup_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
