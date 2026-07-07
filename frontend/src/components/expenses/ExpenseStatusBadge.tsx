import type { ExpenseStatus } from "@/types/expense";

const STATUS_STYLES: Record<ExpenseStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
  label: string;
}

export default function ExpenseStatusBadge({ status, label }: ExpenseStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
