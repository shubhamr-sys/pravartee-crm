import type { UserRole } from "@/types/user";
import { isCommercialRole } from "@/lib/roleAccess";

export interface NavItem {
  href: string;
  label: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CEO: "CEO",
  SALES_HEAD: "Sales Head",
  SALESPERSON: "Salesperson",
  COMMERCIAL: "Commercial",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getNavItemsForRole(role: UserRole): NavItem[] {
  if (isCommercialRole(role)) {
    return [{ href: "/pricing", label: "Pricing queue" }];
  }

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    { href: "/activities", label: "Activities" },
    { href: "/attendance", label: "Attendance" },
    { href: "/expenses", label: "Expenses" },
  ];

  if (role === "CEO") {
    items.push({ href: "/users", label: "Users" });
  }

  if (role === "CEO" || role === "SALES_HEAD") {
    items.push({ href: "/reports/sales", label: "Sales MBR" });
  }

  return items;
}
