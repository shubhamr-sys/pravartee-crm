"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import LeadFilters from "@/components/leads/LeadFilters";
import LeadSummaryCards from "@/components/leads/LeadSummaryCards";
import LeadTable from "@/components/leads/LeadTable";
import { SummaryCardsSkeleton, TableSkeleton } from "@/components/leads/LoadingSkeleton";
import {
  EmptyState,
  ErrorState,
} from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAssignableUsers,
  fetchCategories,
  fetchLeadSummary,
  fetchLeads,
  fetchStages,
} from "@/lib/leadsService";
import type {
  AssignableUser,
  Lead,
  LeadListSummary,
  LeadStage,
  ProductCategory,
} from "@/types/lead";

const PAGE_SIZE = 25;
const PRICING_POLL_INTERVAL_MS = 15_000;

export default function LeadsPage() {
  const { isCEO, isSalesHead } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadListSummary | null>(null);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [followupFrom, setFollowupFrom] = useState("");
  const [followupTo, setFollowupTo] = useState("");
  const [ordering, setOrdering] = useState("-updated_at");

  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listTitle = isCEO
    ? "All Leads"
    : isSalesHead
      ? "Managed Leads"
      : "My Leads";

  const listDescription = isCEO || isSalesHead
    ? "Leads visible to your role across the organization."
    : "Leads assigned to you.";

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        debouncedSearch ||
          stage ||
          category ||
          assignedTo ||
          followupFrom ||
          followupTo,
      ),
    [debouncedSearch, stage, category, assignedTo, followupFrom, followupTo],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stage, category, assignedTo, followupFrom, followupTo, ordering]);

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const data = await fetchLeadSummary();
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    const [stageData, categoryData] = await Promise.all([
      fetchStages(),
      fetchCategories(),
    ]);
    setStages(stageData);
    setCategories(categoryData);

    if (isCEO || isSalesHead) {
      const users = await fetchAssignableUsers();
      setAssignableUsers(users);
    }
  }, [isCEO, isSalesHead]);

  const loadLeads = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await fetchLeads({
        page,
        search: debouncedSearch || undefined,
        stage: stage || undefined,
        category: category || undefined,
        assigned_to: assignedTo || undefined,
        next_followup_date__gte: followupFrom || undefined,
        next_followup_date__lte: followupTo || undefined,
        ordering,
      });
      setLeads(data.results);
      setCount(data.count);
    } catch {
      if (!options?.silent) {
        setError("Unable to load leads. Please try again.");
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [page, debouncedSearch, stage, category, assignedTo, followupFrom, followupTo, ordering]);

  const handlePricingRequested = useCallback((leadId: string) => {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, has_pending_pricing_request: true } : lead,
      ),
    );
  }, []);

  useEffect(() => {
    const hasPendingPricing = leads.some((lead) => lead.has_pending_pricing_request);
    if (!hasPendingPricing) return;

    const intervalId = window.setInterval(() => {
      void loadLeads({ silent: true });
    }, PRICING_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [leads, loadLeads]);

  useEffect(() => {
    loadReferenceData().catch(() => {
      setError("Unable to load lead filters.");
    });
    loadSummary();
  }, [loadReferenceData, loadSummary]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{listTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{listDescription}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Create Lead
          </Link>
        </div>
      </div>

      {isSummaryLoading ? (
        <SummaryCardsSkeleton />
      ) : (
        <LeadSummaryCards summary={summary} />
      )}

      <LeadFilters
        search={search}
        stage={stage}
        category={category}
        assignedTo={assignedTo}
        followupFrom={followupFrom}
        followupTo={followupTo}
        ordering={ordering}
        stages={stages}
        categories={categories}
        assignableUsers={assignableUsers}
        showAssigneeFilter={isCEO || isSalesHead}
        onSearchChange={setSearch}
        onStageChange={setStage}
        onCategoryChange={setCategory}
        onAssignedToChange={setAssignedTo}
        onFollowupFromChange={setFollowupFrom}
        onFollowupToChange={setFollowupTo}
        onOrderingChange={setOrdering}
      />

      {isLoading && <TableSkeleton />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={loadLeads} />
      )}

      {!isLoading && !error && leads.length === 0 && (
        <EmptyState
          message={
            hasActiveFilters
              ? "No leads match your filters."
              : "No leads found."
          }
          actionLabel={hasActiveFilters ? undefined : "Create Lead"}
          actionHref={hasActiveFilters ? undefined : "/leads/new"}
        />
      )}

      {!isLoading && !error && leads.length > 0 && (
        <>
          <LeadTable
            leads={leads}
            canEdit
            onPricingRequested={handlePricingRequested}
          />
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {leads.length} of {count} leads
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
