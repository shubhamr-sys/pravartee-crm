import type { UserRole } from "@/types/user";

const SALES_ROLES: UserRole[] = ["CEO", "SALES_HEAD", "SALESPERSON"];

export function isCommercialRole(role: UserRole | null | undefined): boolean {
  return role === "COMMERCIAL";
}

export function isSalesRole(role: UserRole | null | undefined): boolean {
  return role != null && SALES_ROLES.includes(role);
}

export function defaultHomeForRole(role: UserRole | null | undefined): string {
  if (isCommercialRole(role)) return "/pricing";
  return "/dashboard";
}

const COMMERCIAL_ALLOWED_PREFIXES = ["/pricing", "/account"];

export function isPathAllowedForRole(
  pathname: string,
  role: UserRole | null | undefined,
): boolean {
  if (!isCommercialRole(role)) {
    if (pathname === "/pricing" || pathname.startsWith("/pricing/")) {
      return false;
    }
    return true;
  }
  return COMMERCIAL_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
