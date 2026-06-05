"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import LeadFilters from "@/components/leads/LeadFilters";
import LeadTable from "@/components/leads/LeadTable";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  fetchCategories,
  fetchLeads,
  fetchStages,
} from "@/lib/leadsService";
import type { Lead, LeadStage, ProductCategory } from "@/types/lead";

const PAGE_SIZE = 25;

export default function LeadsPage() {
  const { isCEO, isSalesHead, isSalesperson } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [ordering, setOrdering] = useState("-updated_at");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listTitle = isCEO
    ? "All Leads"
    : isSalesHead
      ? "Managed Leads"
      : "My Leads";

  const listDescription = isSalesperson
    ? "Leads assigned to you."
    : "Leads visible to your role across the organization.";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stage, category, ordering]);

  const loadReferenceData = useCallback(async () => {
    const [stageData, categoryData] = await Promise.all([
      fetchStages(),
      fetchCategories(),
    ]);
    setStages(stageData);
    setCategories(categoryData);
  }, []);

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLeads({
        page,
        search: debouncedSearch || undefined,
        stage: stage || undefined,
        category: category || undefined,
        ordering,
      });
      setLeads(data.results);
      setCount(data.count);
    } catch {
      setError("Unable to load leads. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, stage, category, ordering]);

  useEffect(() => {
    loadReferenceData().catch(() => {
      setError("Unable to load lead filters.");
    });
  }, [loadReferenceData]);

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
        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Create Lead
        </Link>
      </div>

      <LeadFilters
        search={search}
        stage={stage}
        category={category}
        ordering={ordering}
        stages={stages}
        categories={categories}
        onSearchChange={setSearch}
        onStageChange={setStage}
        onCategoryChange={setCategory}
        onOrderingChange={setOrdering}
      />

      {isLoading && <LoadingState message="Loading leads..." />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={loadLeads} />
      )}

      {!isLoading && !error && leads.length === 0 && (
        <EmptyState message="No leads found for the current filters." />
      )}

      {!isLoading && !error && leads.length > 0 && (
        <>
          <LeadTable leads={leads} />
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
