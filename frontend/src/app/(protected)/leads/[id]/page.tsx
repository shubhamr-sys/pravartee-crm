"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";

import FollowupBadge from "@/components/leads/FollowupBadge";
import LeadActivityTimeline from "@/components/leads/LeadActivityTimeline";
import LeadBreadcrumb from "@/components/leads/LeadBreadcrumb";
import LeadNotFound from "@/components/leads/LeadNotFound";
import { DetailSkeleton } from "@/components/leads/LoadingSkeleton";
import { ErrorState } from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { fetchLeadActivities } from "@/lib/activityService";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { deleteLead, fetchLead } from "@/lib/leadsService";
import type { LeadActivity } from "@/types/activity";
import { getLeadSourceLabel, type Lead } from "@/types/lead";

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCEO, isSalesHead } = useAuth();
  const canDelete = isCEO || isSalesHead;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showSavedBanner =
    searchParams.get("saved") === "1" || searchParams.get("created") === "1";

  const loadLead = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [leadData, activityData] = await Promise.all([
        fetchLead(params.id),
        fetchLeadActivities(params.id),
      ]);
      setLead(leadData);
      setActivities(activityData);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else if (isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to view this lead.");
      } else {
        setError("Unable to load lead details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  async function handleDelete() {
    if (!lead || !canDelete) return;
    const confirmed = window.confirm(
      `Delete lead for ${lead.customer_name}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLead(lead.id);
      router.push("/leads");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setDeleteError("You do not have permission to delete this lead.");
      } else {
        setDeleteError("Unable to delete lead.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (notFound) {
    return <LeadNotFound />;
  }

  if (error || !lead) {
    return <ErrorState message={error || "Unable to load lead."} onRetry={loadLead} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <LeadBreadcrumb customerName={lead.customer_name} />
          <Link
            href="/leads"
            className="mt-3 inline-block text-sm text-teal-700 hover:text-teal-800"
          >
            ← Back to Leads
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {lead.customer_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {lead.company_name || "No company"} · {lead.stage_name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/leads/${lead.id}/edit`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Edit Lead
          </Link>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete Lead"}
            </button>
          )}
        </div>
      </div>

      {showSavedBanner && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Lead saved successfully.
        </div>
      )}

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Customer Information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Customer Name" value={lead.customer_name} />
            <DetailItem label="Company Name" value={lead.company_name} />
            <DetailItem label="Contact Person" value={lead.contact_person} />
            <DetailItem label="Phone" value={lead.phone} />
            <DetailItem label="Email" value={lead.email} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Lead Information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Stage" value={lead.stage_name} />
            <DetailItem label="Category" value={lead.category_name} />
            <DetailItem label="Assigned To" value={lead.assigned_to_name} />
            <DetailItem
              label="Estimated Value"
              value={formatCurrency(lead.estimated_value)}
            />
            <DetailItem
              label="Lead Source"
              value={getLeadSourceLabel(lead.lead_source)}
            />
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Next Follow-up Date
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-900">
                  {formatDate(lead.next_followup_date) || "—"}
                </p>
                <FollowupBadge
                  followupDate={lead.next_followup_date}
                  status={lead.followup_status}
                />
              </div>
            </div>
            <DetailItem label="Created Date" value={formatDateTime(lead.created_at)} />
            <DetailItem label="Updated Date" value={formatDateTime(lead.updated_at)} />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
          {lead.notes || "No notes added."}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
        <div className="mt-4">
          <LeadActivityTimeline activities={activities} />
        </div>
      </section>
    </div>
  );
}
