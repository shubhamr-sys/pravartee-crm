import type { User } from "@/types/user";

export type ExpenseCategory =
  | "TRAVEL"
  | "FOOD"
  | "ACCOMMODATION"
  | "FUEL"
  | "OTHER";

export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ExpenseTab = "my" | "pending" | "approved" | "rejected" | "all";

export interface Expense {
  id: string;
  display_id: string;
  title: string;
  submitted_by: User;
  employee_name: string;
  employee_role: string;
  team_name: string | null;
  lead: string | null;
  lead_name: string | null;
  category: ExpenseCategory;
  category_display: string;
  amount: string;
  claimed_amount: string;
  approved_amount: string | null;
  expense_date: string;
  description: string;
  receipt: string | null;
  receipt_url: string | null;
  status: ExpenseStatus;
  status_display: string;
  reviewed_by: User | null;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSummary {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_pending_amount: string | number;
  total_approved_amount: string | number;
  total_rejected_amount?: string | number;
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  category_display: string;
  count: number;
  amount: string | number;
  pending_amount: string | number;
}

export interface ExpenseEmployeeSummary {
  user_id: string;
  employee_name: string;
  expense_count: number;
  pending_count: number;
  pending_amount: string | number;
  approved_amount: string | number;
}

export interface ExpenseDashboard {
  month: string | null;
  summary: ExpenseSummary;
  by_category: ExpenseCategorySummary[];
  by_employee: ExpenseEmployeeSummary[];
  recent_pending: Expense[];
}

export interface ExpenseListParams {
  page?: number;
  tab?: ExpenseTab;
  category?: ExpenseCategory | "";
  expense_date?: string;
  submitted_by?: string;
  search?: string;
}

export interface PaginatedExpenseResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Expense[];
}

export interface ExpenseFormData {
  category: ExpenseCategory | "";
  amount: string;
  expense_date: string;
  description: string;
  lead: string;
  receipt: File | null;
}

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "TRAVEL", label: "Travel" },
  { value: "FOOD", label: "Food" },
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "FUEL", label: "Fuel" },
  { value: "OTHER", label: "Other" },
];
