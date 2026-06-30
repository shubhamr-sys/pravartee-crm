"use client";

import Link from "next/link";

import { formatDateTime } from "@/lib/format";
import { pricingHierarchyLabel, pricingLineSummary } from "@/lib/pricingUtils";
import type { PricingQueueItem } from "@/types/pricing";

interface PricingQueueCardProps {
  item: PricingQueueItem;
}

export default function PricingQueueCard({ item }: PricingQueueCardProps) {
  const isPending = item.status === "PENDING";

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{item.customer_name}</h2>
          <p className="mt-0.5 text-sm text-slate-600">{item.company_name || "—"}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            isPending
              ? "bg-amber-100 text-amber-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {item.status_display}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Stage</dt>
          <dd className="font-medium text-slate-800">{item.stage_name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Record type</dt>
          <dd className="font-medium text-slate-800">{item.record_type_display}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Requested by</dt>
          <dd className="font-medium text-slate-800">{item.requested_by_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Sales owner</dt>
          <dd className="font-medium text-slate-800">{item.assigned_to_name || "Unassigned"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Requested at</dt>
          <dd className="font-medium text-slate-800">{formatDateTime(item.requested_at)}</dd>
        </div>
        {item.address ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Address</dt>
            <dd className="font-medium text-slate-800">{item.address}</dd>
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

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Products ({item.line_items.length})
        </p>
        <ul className="mt-2 space-y-2">
          {item.line_items.map((line) => (
            <li
              key={line.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
            >
              <p className="font-medium text-slate-900">{pricingLineSummary(line)}</p>
              {(line.specification || line.remarks) && (
                <p className="mt-1 text-slate-600">
                  {[line.specification, line.remarks].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {isPending ? (
          <Link
            href={`/pricing/${item.id}`}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Submit pricing
          </Link>
        ) : (
          <Link
            href={`/pricing/${item.id}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            View response
          </Link>
        )}
      </div>
    </article>
  );
}
