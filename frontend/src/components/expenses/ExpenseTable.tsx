"use client";

import { useState } from "react";

import ExpenseStatusBadge from "@/components/expenses/ExpenseStatusBadge";
import type { Expense } from "@/types/expense";

interface ExpenseTableProps {
  expenses: Expense[];
  showEmployee: boolean;
  canReview: boolean;
  currentUserId: string;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
}

function formatAmount(amount: string | number): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return String(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExpenseTable({
  expenses,
  showEmployee,
  canReview,
  currentUserId,
  onApprove,
  onReject,
}: ExpenseTableProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleApprove(id: string) {
    setIsSubmitting(true);
    try {
      await onApprove(id, reviewNotes);
      setActiveId(null);
      setReviewNotes("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(id: string) {
    setIsSubmitting(true);
    try {
      await onReject(id, reviewNotes);
      setActiveId(null);
      setReviewNotes("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              {showEmployee ? (
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              ) : null}
              <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Project</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Receipt</th>
              {canReview ? (
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => (
              <tr key={expense.id} className="align-top">
                <td className="px-4 py-3 text-slate-700">{formatDate(expense.expense_date)}</td>
                {showEmployee ? (
                  <td className="px-4 py-3 text-slate-700">{expense.employee_name}</td>
                ) : null}
                <td className="px-4 py-3 text-slate-700">{expense.category_display}</td>
                <td className="px-4 py-3 text-slate-700">{expense.lead_name || "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {formatAmount(expense.amount)}
                </td>
                <td className="px-4 py-3">
                  <ExpenseStatusBadge
                    status={expense.status}
                    label={expense.status_display}
                  />
                </td>
                <td className="px-4 py-3">
                  {expense.receipt_url ? (
                    <a
                      href={expense.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-teal-700 hover:text-teal-800"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {canReview ? (
                  <td className="px-4 py-3">
                    {expense.status === "PENDING" &&
                    expense.submitted_by.id !== currentUserId ? (
                      <div className="space-y-2">
                        {activeId === expense.id ? (
                          <>
                            <textarea
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              rows={2}
                              placeholder="Review notes (optional)"
                              className="w-full min-w-[180px] rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => void handleApprove(expense.id)}
                                className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => void handleReject(expense.id)}
                                className="rounded-lg bg-rose-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-800 disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveId(null);
                                  setReviewNotes("");
                                }}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveId(expense.id)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
