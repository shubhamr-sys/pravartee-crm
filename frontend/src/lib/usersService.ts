import { api } from "@/lib/api";
import type {
  CreateUserPayload,
  CreateUserResponse,
  ManagedUser,
  ResetPasswordResponse,
  UpdateUserPayload,
} from "@/types/userManagement";

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const { data } = await api.get<ManagedUser[]>("/api/v1/auth/manage/users/");
  return data;
}

export async function createManagedUser(
  payload: CreateUserPayload,
): Promise<CreateUserResponse> {
  const { data } = await api.post<CreateUserResponse>(
    "/api/v1/auth/manage/users/",
    payload,
  );
  return data;
}

export async function updateManagedUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<ManagedUser> {
  const { data } = await api.patch<ManagedUser>(
    `/api/v1/auth/manage/users/${id}/`,
    payload,
  );
  return data;
}

export async function activateUser(id: string): Promise<ManagedUser> {
  const { data } = await api.post<ManagedUser>(
    `/api/v1/auth/manage/users/${id}/activate/`,
  );
  return data;
}

export async function deactivateUser(id: string): Promise<ManagedUser> {
  const { data } = await api.post<ManagedUser>(
    `/api/v1/auth/manage/users/${id}/deactivate/`,
  );
  return data;
}

export async function resetUserPassword(
  id: string,
): Promise<ResetPasswordResponse> {
  const { data } = await api.post<ResetPasswordResponse>(
    `/api/v1/auth/manage/users/${id}/reset-password/`,
  );
  return data;
}
