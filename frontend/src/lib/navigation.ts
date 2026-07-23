import type { UserRole } from "@/types/user";
import { isAccountsRole, isCommercialRole } from "@/lib/roleAccess";

export interface NavItem {
  href: string;
  label: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CEO: "CEO",
  SALES_HEAD: "Sales Head",
  SALESPERSON: "Salesperson",
  COMMERCIAL: "Commercial",
  ACCOUNTS: "Accounts",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getNavItemsForRole(role: UserRole): NavItem[] {
  if (isCommercialRole(role)) {
    return [{ href: "/pricing", label: "Pricing queue" }];
  }

  if (isAccountsRole(role)) {
    return [
      { href: "/expenses", label: "All Expenses" },
      { href: "/expenses/dashboard", label: "Dashboard" },
    ];
  }

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    { href: "/activities", label: "Activities" },
    { href: "/attendance", label: "Attendance" },
    { href: "/visits", label: "Visits" },
    { href: "/expenses", label: "Expenses" },
  ];

  if (role === "CEO") {
    items.push({ href: "/users", label: "Users" });
  }

  if (role === "CEO" || role === "SALES_HEAD") {
    items.push({ href: "/reports/sales", label: "Sales MBR" });
  }

  if (role === "CEO") {
    items.push({ href: "/expenses/dashboard", label: "Expense dashboard" });
  }

  return items;
}
