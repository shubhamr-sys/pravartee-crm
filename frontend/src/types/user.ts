export type UserRole = "CEO" | "SALES_HEAD" | "SALESPERSON" | "COMMERCIAL" | "ACCOUNTS";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RefreshResponse {
  access: string;
  refresh: string;
}
