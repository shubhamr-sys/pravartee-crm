"use client";

import { useCallback, useEffect, useState } from "react";

import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  approveExpense,
  createExpense,
  fetchExpenses,
  fetchExpenseSummary,
  fetchExpenseUsers,
  rejectExpense,
} from "@/lib/expensesService";
import { fetchLeads } from "@/lib/leadsService";
import type { Expense, ExpenseCategory, ExpenseFormData, ExpenseSummary, ExpenseTab } from "@/types/expense";
import type { AssignableUser, Lead } from "@/types/lead";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

type TabOption = { value: ExpenseTab; label: string };

export default function ExpensesPage() {
  const { user, isCEO, isSalesHead } = useAuth();
  const isManager = isCEO || isSalesHead;

  const [activeTab, setActiveTab] = useState<ExpenseTab>("my");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [expenseDate, setExpenseDate] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs: TabOption[] = isManager
    ? [
        { value: "my", label: "My expenses" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "all", label: "All" },
      ]
    : [
        { value: "my", label: "My expenses" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadSummary = useCallback(async () => {
    const data = await fetchExpenseSummary();
    setSummary(data);
  }, []);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses({
        page,
        tab: activeTab,
        category: category || undefined,
        expense_date: expenseDate || undefined,
        submitted_by: submittedBy || undefined,
        search: debouncedSearch || undefined,
      });
      setExpenses(data.results);
      setCount(data.count);
    } catch {
      setError("Unable to load expenses.");
    } finally {
      setIsLoading(false);
    }
  }, [page, activeTab, category, expenseDate, submittedBy, debouncedSearch]);

  useEffect(() => {
    void loadSummary().catch(() => undefined);
  }, [loadSummary]);

  useEffect(() => {
    void fetchLeads({ ordering: "-updated_at" })
      .then((data) => setLeads(data.results))
      .catch(() => setLeads([]));
  }, []);

  useEffect(() => {
    if (isManager) {
      void fetchExpenseUsers()
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [isManager]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, category, expenseDate, submittedBy, debouncedSearch]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  async function handleCreateExpense(form: ExpenseFormData) {
    setIsSubmitting(true);
    try {
      await createExpense(form);
      await Promise.all([loadExpenses(), loadSummary()]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(id: string, notes = "") {
    await approveExpense(id, notes);
    await Promise.all([loadExpenses(), loadSummary()]);
  }

  async function handleReject(id: string, notes = "") {
    await rejectExpense(id, notes);
    await Promise.all([loadExpenses(), loadSummary()]);
  }

  function clearFilters() {
    setCategory("");
    setExpenseDate("");
    setSubmittedBy("");
    setSearch("");
    setDebouncedSearch("");
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const showEmployeeColumn = activeTab !== "my" && isManager;
  const showReviewActions = isCEO && activeTab === "pending";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit field expenses and track approval status.
          </p>
        </div>
        {summary && summary.pending_count > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {summary.pending_count} pending
          </span>
        ) : null}
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Pending amount</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {Number(summary.total_pending_amount).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
              })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Approved amount</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {Number(summary.total_approved_amount).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
              })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {summary.approved_count}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {summary.rejected_count}
            </p>
          </div>
        </div>
      ) : null}

      <ExpenseForm
        leads={leads}
        isSubmitting={isSubmitting}
        onSubmit={handleCreateExpense}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.value
                ? "bg-teal-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ExpenseFilters
        category={category}
        expenseDate={expenseDate}
        submittedBy={submittedBy}
        search={search}
        users={users}
        showUserFilter={isManager && activeTab !== "my"}
        onCategoryChange={setCategory}
        onExpenseDateChange={setExpenseDate}
        onSubmittedByChange={setSubmittedBy}
        onSearchChange={setSearch}
        onClear={clearFilters}
      />

      {isLoading && expenses.length === 0 ? (
        <LoadingState message="Loading expenses..." />
      ) : null}

      {!isLoading && error ? (
        <ErrorState message={error} onRetry={() => void loadExpenses()} />
      ) : null}

      {!isLoading && !error && expenses.length === 0 ? (
        <EmptyState message="No expenses match your filters." />
      ) : null}

      {!isLoading && !error && expenses.length > 0 ? (
        <>
          <ExpenseTable
            expenses={expenses}
            showEmployee={showEmployeeColumn}
            canReview={showReviewActions}
            currentUserId={user?.id ?? ""}
            onApprove={handleApprove}
            onReject={handleReject}
          />
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {expenses.length} of {count} expenses
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
