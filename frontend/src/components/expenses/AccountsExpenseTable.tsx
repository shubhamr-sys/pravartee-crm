"use client";

import { useState } from "react";

import ExpenseStatusBadge from "@/components/expenses/ExpenseStatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/types/expense";

interface AccountsExpenseTableProps {
  expenses: Expense[];
  currentUserId: string;
  canReview: boolean;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
}

function dash(value: string | null | undefined): string {
  if (value == null || value === "") return "NA";
  return value;
}

export default function AccountsExpenseTable({
  expenses,
  currentUserId,
  canReview,
  onApprove,
  onReject,
}: AccountsExpenseTableProps) {
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
              <th className="px-3 py-3 text-left font-medium text-slate-600">Title</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Id</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Team</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-3 py-3 text-right font-medium text-slate-600">Claimed</th>
              <th className="px-3 py-3 text-right font-medium text-slate-600">Approved</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Comment</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Date</th>
              {canReview ? (
                <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const canAct =
                canReview &&
                expense.status === "PENDING" &&
                expense.submitted_by.id !== currentUserId;

              return (
                <tr key={expense.id} className="align-top hover:bg-slate-50/80">
                  <td className="max-w-[180px] px-3 py-3">
                    <p className="font-medium text-slate-900 line-clamp-2">{expense.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{expense.employee_role}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-700">
                    {expense.display_id}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">{expense.employee_name}</p>
                    {expense.lead_name ? (
                      <p className="mt-0.5 text-xs text-slate-500">{expense.lead_name}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{dash(expense.team_name)}</td>
                  <td className="px-3 py-3 text-slate-700">{expense.category_display} Expense</td>
                  <td className="px-3 py-3">
                    <ExpenseStatusBadge
                      status={expense.status}
                      label={expense.status_display}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(expense.claimed_amount ?? expense.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">
                    {expense.approved_amount != null
                      ? formatCurrency(expense.approved_amount)
                      : "NA"}
                  </td>
                  <td className="max-w-[160px] px-3 py-3 text-slate-600">
                    <span className="line-clamp-2">
                      {dash(expense.review_notes || null)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatDate(expense.expense_date)}
                  </td>
                  {canReview ? (
                    <td className="px-3 py-3">
                      {canAct ? (
                        <div className="space-y-2">
                          {activeId === expense.id ? (
                            <>
                              <textarea
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={2}
                                placeholder="Comment (optional)"
                                className="w-full min-w-[160px] rounded-lg border border-slate-300 px-2 py-1 text-sm"
                              />
                              <div className="flex flex-wrap gap-2">
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
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveId(expense.id)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                              >
                                Review
                              </button>
                              {expense.receipt_url ? (
                                <a
                                  href={expense.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-white"
                                >
                                  Receipt
                                </a>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : expense.receipt_url ? (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-teal-700 hover:text-teal-800"
                        >
                          Receipt
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
