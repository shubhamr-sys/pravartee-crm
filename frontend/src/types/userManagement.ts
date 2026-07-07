import type { UserRole } from "@/types/user";

export interface ManagedUser {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  username: string;
  role: UserRole;
  manager_id?: string | null;
  manager_name?: string | null;
  status: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: UserRole;
  manager?: string | null;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: UserRole;
  is_active?: boolean;
  manager?: string | null;
}

export interface CreateUserResponse extends ManagedUser {
  temporary_password?: string;
}

export interface ResetPasswordResponse {
  message: string;
  temporary_password: string;
}
