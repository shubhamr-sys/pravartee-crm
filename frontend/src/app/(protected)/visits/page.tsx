"use client";

import { useCallback, useEffect, useState } from "react";

import VisitCheckButtons from "@/components/visits/VisitCheckButtons";
import VisitTable from "@/components/visits/VisitTable";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { formFieldClass } from "@/lib/formStyles";
import {
  fetchActiveVisit,
  fetchVisits,
} from "@/lib/visitsService";
import type { FieldVisit, VisitStatus } from "@/types/visit";

const PAGE_SIZE = 25;

export default function VisitsPage() {
  const { isCEO, isSalesHead } = useAuth();
  const canSeeTeam = isCEO || isSalesHead;

  const [activeVisit, setActiveVisit] = useState<FieldVisit | null>(null);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<VisitStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadActive = useCallback(async () => {
    const visit = await fetchActiveVisit();
    setActiveVisit(visit);
  }, []);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVisits({
        page,
        status,
        search: debouncedSearch,
      });
      setVisits(data.results);
      setCount(data.count);
    } catch {
      setError("Unable to load visits.");
    } finally {
      setIsLoading(false);
    }
  }, [page, status, debouncedSearch]);

  const refresh = useCallback(async () => {
    await Promise.all([loadActive(), loadList()]);
  }, [loadActive, loadList]);

  useEffect(() => {
    void loadActive().catch(() => undefined);
  }, [loadActive]);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Field visits</h1>
        <p className="mt-1 text-sm text-slate-500">
          Check in and out at client or government departments. Separate from daily
          attendance.
        </p>
      </div>

      <VisitCheckButtons activeVisit={activeVisit} onSuccess={() => void refresh()} />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div className="md:col-span-2">
          <label htmlFor="visit-search" className="mb-1 block text-xs font-medium text-slate-500">
            Search department
          </label>
          <input
            id="visit-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Department name, purpose..."
            className={formFieldClass}
          />
        </div>
        <div>
          <label htmlFor="visit-status" className="mb-1 block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            id="visit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as VisitStatus | "")}
            className={formFieldClass}
          >
            <option value="">All</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {isLoading && visits.length === 0 ? (
        <LoadingState message="Loading visits..." />
      ) : null}

      {!isLoading && error ? (
        <ErrorState message={error} onRetry={() => void loadList()} />
      ) : null}

      {!isLoading && !error && visits.length === 0 ? (
        <EmptyState message="No field visits recorded yet." />
      ) : null}

      {!isLoading && !error && visits.length > 0 ? (
        <>
          <VisitTable visits={visits} showEmployee={canSeeTeam} />
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {visits.length} of {count} visits
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
      ) : null}
    </div>
  );
}
