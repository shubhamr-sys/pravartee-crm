"use client";

import { useCallback, useEffect, useState } from "react";

import PricingQueueCard from "@/components/pricing/PricingQueueCard";
import PricingQueueFilters, {
  type PricingQueueDateOrder,
} from "@/components/pricing/PricingQueueFilters";
import { LoadingState, ErrorState } from "@/components/leads/StatusMessage";
import {
  fetchPricingMetrics,
  fetchPricingQueue,
  fetchPricingQueueOwners,
  type PricingQueueStatusFilter,
} from "@/lib/pricingService";
import type { PricingQueueItem, PricingQueueOwner } from "@/types/pricing";

const POLL_INTERVAL_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

export default function PricingDashboardPage() {
  const [items, setItems] = useState<PricingQueueItem[]>([]);
  const [owners, setOwners] = useState<PricingQueueOwner[]>([]);
  const [statusFilter, setStatusFilter] = useState<PricingQueueStatusFilter>("PENDING");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [requestedOn, setRequestedOn] = useState("");
  const [order, setOrder] = useState<PricingQueueDateOrder>("-requested_at");
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [queue, metrics] = await Promise.all([
        fetchPricingQueue(statusFilter, {
          search: debouncedSearch,
          assigned_to: assignedTo,
          requested_on: requestedOn,
          order,
        }),
        fetchPricingMetrics(),
      ]);
      setItems(queue);
      setPendingCount(metrics.pending_pricing_requests);
    } catch {
      setError("Unable to load pricing requests.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, debouncedSearch, assignedTo, requestedOn, order]);

  useEffect(() => {
    void fetchPricingQueueOwners()
      .then(setOwners)
      .catch(() => setOwners([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setAssignedTo("");
    setRequestedOn("");
    setOrder("-requested_at");
  }

  if (isLoading && items.length === 0) {
    return <LoadingState message="Loading pricing queue..." />;
  }

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pricing queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review lead pricing requests and submit unit prices from one place.
          </p>
        </div>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {pendingCount} pending
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "PENDING", label: "Pending" },
            { value: "RESPONDED", label: "Responded" },
            { value: "", label: "All" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              statusFilter === tab.value
                ? "bg-teal-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PricingQueueFilters
        search={search}
        assignedTo={assignedTo}
        requestedOn={requestedOn}
        order={order}
        owners={owners}
        onSearchChange={setSearch}
        onAssignedToChange={setAssignedTo}
        onRequestedOnChange={setRequestedOn}
        onOrderChange={setOrder}
        onClear={clearFilters}
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            {statusFilter === "PENDING" && !debouncedSearch && !assignedTo && !requestedOn
              ? "No pending pricing requests right now."
              : "No pricing requests match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <PricingQueueCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
