"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import ExpenseStatusBadge from "@/components/expenses/ExpenseStatusBadge";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import { ErrorState, LoadingState } from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  approveExpense,
  fetchExpenseDashboard,
  rejectExpense,
} from "@/lib/expensesService";
import { formatCurrency } from "@/lib/format";
import type { ExpenseDashboard } from "@/types/expense";

function currentMonthValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export default function ExpenseDashboardPage() {
  const { user, isCEO, isAccounts } = useAuth();
  const canReview = isCEO || isAccounts;
  const [month, setMonth] = useState(currentMonthValue);
  const [dashboard, setDashboard] = useState<ExpenseDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchExpenseDashboard(month);
      setDashboard(data);
    } catch {
      setError("Unable to load expense dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const categoryWithSpend = useMemo(
    () =>
      (dashboard?.by_category ?? []).filter(
        (row) => Number(row.amount) > 0 || Number(row.pending_amount) > 0,
      ),
    [dashboard],
  );

  async function handleApprove(id: string, notes = "") {
    await approveExpense(id, notes);
    await loadDashboard();
  }

  async function handleReject(id: string, notes = "") {
    await rejectExpense(id, notes);
    await loadDashboard();
  }

  if (isLoading && !dashboard) {
    return <LoadingState message="Loading expense dashboard..." />;
  }

  if (error && !dashboard) {
    return <ErrorState message={error} onRetry={() => void loadDashboard()} />;
  }

  if (!dashboard) {
    return null;
  }

  const { summary } = dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Expense dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review organization-wide expense claims and reimbursement status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Month</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <Link
            href="/expenses?tab=pending"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View all expenses
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-800">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">
            {summary.pending_count}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {formatCurrency(summary.total_pending_amount)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-800">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">
            {summary.approved_count}
          </p>
          <p className="mt-1 text-sm text-emerald-900">
            {formatCurrency(summary.total_approved_amount)}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm text-rose-800">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-rose-950">
            {summary.rejected_count}
          </p>
          <p className="mt-1 text-sm text-rose-900">
            {formatCurrency(summary.total_rejected_amount ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total claims</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.pending_count + summary.approved_count + summary.rejected_count}
          </p>
          <p className="mt-1 text-sm text-slate-600">In selected month</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By category</h2>
          {categoryWithSpend.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No expenses in this month.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Claims</th>
                    <th className="px-2 py-2 font-medium">Pending</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryWithSpend.map((row) => (
                    <tr key={row.category} className="border-b border-slate-100">
                      <td className="px-2 py-2">{row.category_display}</td>
                      <td className="px-2 py-2">{row.count}</td>
                      <td className="px-2 py-2">{formatCurrency(row.pending_amount)}</td>
                      <td className="px-2 py-2 font-medium">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By employee</h2>
          {dashboard.by_employee.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No employee expenses in this month.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-2 py-2 font-medium">Employee</th>
                    <th className="px-2 py-2 font-medium">Pending</th>
                    <th className="px-2 py-2 font-medium">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.by_employee.map((row) => (
                    <tr key={row.user_id} className="border-b border-slate-100">
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-900">{row.employee_name}</div>
                        <div className="text-xs text-slate-500">
                          {row.expense_count} claim{row.expense_count === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {row.pending_count > 0 ? (
                          <span className="font-medium text-amber-800">
                            {formatCurrency(row.pending_amount)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2">{formatCurrency(row.approved_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Pending approvals</h2>
          {summary.pending_count > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              {summary.pending_count} awaiting review
            </span>
          ) : null}
        </div>

        {dashboard.recent_pending.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No pending expenses for this month.
          </div>
        ) : canReview ? (
          <ExpenseTable
            expenses={dashboard.recent_pending}
            showEmployee
            canReview
            currentUserId={user?.id ?? ""}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.recent_pending.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-4 py-3 text-slate-700">{expense.expense_date}</td>
                      <td className="px-4 py-3 text-slate-700">{expense.employee_name}</td>
                      <td className="px-4 py-3 text-slate-700">{expense.category_display}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <ExpenseStatusBadge
                          status={expense.status}
                          label={expense.status_display}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
