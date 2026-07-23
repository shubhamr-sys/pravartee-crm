"use client";

import { useCallback, useEffect, useState } from "react";

import UserFormModal from "@/components/users/UserFormModal";
import { LoadingState, ErrorState } from "@/components/leads/StatusMessage";
import { formatDateTime } from "@/lib/format";
import { getRoleLabel } from "@/lib/navigation";
import {
  activateUser,
  createManagedUser,
  deactivateUser,
  fetchManagedUsers,
  resetUserPassword,
  updateManagedUser,
} from "@/lib/usersService";
import type { CreateUserPayload, ManagedUser } from "@/types/userManagement";
import type { UserRole } from "@/types/user";

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchManagedUsers();
      setUsers(data);
    } catch {
      setError("Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(payload: CreateUserPayload) {
    setIsSubmitting(true);
    try {
      const created = await createManagedUser(payload);
      setMessage(
        created.temporary_password
          ? `User created. Temporary password: ${created.temporary_password}`
          : "User created successfully.",
      );
      await loadUsers();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(user: ManagedUser, role: UserRole) {
    setIsSubmitting(true);
    try {
      await updateManagedUser(user.id, { role });
      await loadUsers();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(user: ManagedUser) {
    setIsSubmitting(true);
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }
      await loadUsers();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(user: ManagedUser) {
    setIsSubmitting(true);
    try {
      const response = await resetUserPassword(user.id);
      setMessage(`Password reset for ${user.name}. Temporary password: ${response.temporary_password}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage CRM users. CEO access only. System administrators
            are managed via Django admin, not shown here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Create User
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {isLoading && <LoadingState message="Loading users..." />}
      {!isLoading && error && <ErrorState message={error} onRetry={loadUsers} />}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Reports to</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Last Login</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                    <td className="px-4 py-3 text-slate-700">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        value={user.role}
                        disabled={isSubmitting}
                        onChange={(e) =>
                          void handleRoleChange(user, e.target.value as UserRole)
                        }
                      >
                        <option value="CEO">CEO</option>
                        <option value="SALES_HEAD">Sales Head</option>
                        <option value="SALESPERSON">Salesperson</option>
                        <option value="COMMERCIAL">Commercial (Pricing)</option>
                        <option value="ACCOUNTS">Accounts (Expenses)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.manager_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(user.last_login)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleToggleActive(user)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleResetPassword(user)}
                          className="rounded-lg border border-blue-600 px-2 py-1 text-xs text-blue-700"
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">{selectedUser.name}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd>{selectedUser.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Username</dt>
                <dd>{selectedUser.username}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd>{getRoleLabel(selectedUser.role)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Reports to</dt>
                <dd>{selectedUser.manager_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>{selectedUser.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last Login</dt>
                <dd>{formatDateTime(selectedUser.last_login)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <UserFormModal
        isOpen={modalOpen}
        managers={users}
        isSubmitting={isSubmitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
