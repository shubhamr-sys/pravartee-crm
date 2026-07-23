import type { UserRole } from "@/types/user";

const SALES_ROLES: UserRole[] = ["CEO", "SALES_HEAD", "SALESPERSON"];

export function isCommercialRole(role: UserRole | null | undefined): boolean {
  return role === "COMMERCIAL";
}

export function isAccountsRole(role: UserRole | null | undefined): boolean {
  return role === "ACCOUNTS";
}

export function isSalesRole(role: UserRole | null | undefined): boolean {
  return role != null && SALES_ROLES.includes(role);
}

export function defaultHomeForRole(role: UserRole | null | undefined): string {
  if (isCommercialRole(role)) return "/pricing";
  if (isAccountsRole(role)) return "/expenses";
  return "/dashboard";
}

const COMMERCIAL_ALLOWED_PREFIXES = ["/pricing", "/account"];

const ACCOUNTS_ALLOWED_PREFIXES = ["/expenses", "/account"];

export function isPathAllowedForRole(
  pathname: string,
  role: UserRole | null | undefined,
): boolean {
  if (isAccountsRole(role)) {
    return ACCOUNTS_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }

  if (isCommercialRole(role)) {
    return COMMERCIAL_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }

  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) {
    return false;
  }
  if (pathname === "/expenses/dashboard" || pathname.startsWith("/expenses/dashboard/")) {
    return role === "CEO";
  }
  return true;
}
