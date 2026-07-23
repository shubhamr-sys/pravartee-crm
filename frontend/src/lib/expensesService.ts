import { api } from "@/lib/api";
import type { AssignableUser } from "@/types/lead";
import type {
  Expense,
  ExpenseDashboard,
  ExpenseFormData,
  ExpenseListParams,
  ExpenseSummary,
  PaginatedExpenseResponse,
} from "@/types/expense";

export async function fetchExpenseSummary(): Promise<ExpenseSummary> {
  const { data } = await api.get<ExpenseSummary>("/api/v1/expenses/summary/");
  return data;
}

export async function fetchExpenseDashboard(month?: string): Promise<ExpenseDashboard> {
  const { data } = await api.get<ExpenseDashboard>("/api/v1/expenses/dashboard/", {
    params: month ? { month } : undefined,
  });
  return data;
}

export async function fetchExpenses(
  params: ExpenseListParams = {},
): Promise<PaginatedExpenseResponse> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.tab) query.tab = params.tab;
  if (params.category) query.category = params.category;
  if (params.expense_date) query.expense_date = params.expense_date;
  if (params.submitted_by) query.submitted_by = params.submitted_by;
  if (params.search?.trim()) query.search = params.search.trim();

  const { data } = await api.get<PaginatedExpenseResponse>("/api/v1/expenses/", {
    params: Object.keys(query).length > 0 ? query : undefined,
  });
  return data;
}

export async function downloadExpensesExport(
  params: ExpenseListParams = {},
): Promise<Blob> {
  const query: Record<string, string | number> = {};
  if (params.tab) query.tab = params.tab;
  if (params.category) query.category = params.category;
  if (params.expense_date) query.expense_date = params.expense_date;
  if (params.submitted_by) query.submitted_by = params.submitted_by;
  if (params.search?.trim()) query.search = params.search.trim();

  const { data } = await api.get<Blob>("/api/v1/expenses/export/", {
    params: Object.keys(query).length > 0 ? query : undefined,
    responseType: "blob",
  });
  return data;
}

export async function fetchExpenseUsers(): Promise<AssignableUser[]> {
  const { data } = await api.get<AssignableUser[]>("/api/v1/expenses/users/");
  return data;
}

export async function createExpense(form: ExpenseFormData): Promise<Expense> {
  if (!form.category) {
    throw new Error("Category is required.");
  }
  if (!form.amount.trim()) {
    throw new Error("Amount is required.");
  }
  if (!form.expense_date) {
    throw new Error("Expense date is required.");
  }
  if (!form.receipt) {
    throw new Error("Receipt is required.");
  }
  const formData = new FormData();
  formData.append("category", form.category);
  formData.append("amount", form.amount);
  formData.append("expense_date", form.expense_date);
  formData.append("description", form.description);
  if (form.lead) formData.append("lead", form.lead);
  formData.append("receipt", form.receipt);

  const { data } = await api.post<Expense>("/api/v1/expenses/", formData);
  return data;
}

export async function approveExpense(
  id: string,
  reviewNotes = "",
): Promise<Expense> {
  const { data } = await api.post<Expense>(`/api/v1/expenses/${id}/approve/`, {
    review_notes: reviewNotes,
  });
  return data;
}

export async function rejectExpense(
  id: string,
  reviewNotes = "",
): Promise<Expense> {
  const { data } = await api.post<Expense>(`/api/v1/expenses/${id}/reject/`, {
    review_notes: reviewNotes,
  });
  return data;
}
