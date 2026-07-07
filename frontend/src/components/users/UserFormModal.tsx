"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { CreateUserPayload, ManagedUser } from "@/types/userManagement";
import type { UserRole } from "@/types/user";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "CEO", label: "CEO" },
  { value: "SALES_HEAD", label: "Sales Head" },
  { value: "SALESPERSON", label: "Salesperson" },
  { value: "COMMERCIAL", label: "Commercial (Pricing)" },
];

interface UserFormModalProps {
  isOpen: boolean;
  initial?: ManagedUser | null;
  managers: ManagedUser[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateUserPayload) => Promise<void>;
}

export default function UserFormModal({
  isOpen,
  initial = null,
  managers,
  isSubmitting = false,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<CreateUserPayload>({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    role: "SALESPERSON",
    manager: "",
  });
  const [error, setError] = useState<string | null>(null);

  const managerOptions = useMemo(() => {
    if (values.role === "SALES_HEAD") {
      return managers.filter((user) => user.role === "CEO");
    }
    if (values.role === "SALESPERSON") {
      return managers.filter((user) => user.role === "SALES_HEAD");
    }
    return [];
  }, [managers, values.role]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      email: initial?.email ?? "",
      username: initial?.username ?? "",
      role: initial?.role ?? "SALESPERSON",
      manager: initial?.manager_id ?? "",
    });
    setError(null);
  }, [isOpen, initial]);

  useEffect(() => {
    if (values.role === "CEO" || values.role === "COMMERCIAL") {
      setValues((current) => ({ ...current, manager: "" }));
    }
  }, [values.role]);

  if (!isOpen || !mounted || initial) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.first_name.trim() || !values.last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!values.email.trim() || !values.username.trim()) {
      setError("Email and username are required.");
      return;
    }
    if (values.role === "SALES_HEAD" && !values.manager) {
      setError("Sales Head must report to a CEO.");
      return;
    }
    if (values.role === "SALESPERSON" && !values.manager) {
      setError("Salesperson must report to a Sales Head.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        ...values,
        manager: values.manager || null,
      });
      onClose();
    } catch {
      setError("Unable to create user.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Create User</h2>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">First Name</label>
              <input
                className={inputClass}
                value={values.first_name}
                onChange={(e) =>
                  setValues((c) => ({ ...c, first_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last Name</label>
              <input
                className={inputClass}
                value={values.last_name}
                onChange={(e) =>
                  setValues((c) => ({ ...c, last_name: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className={inputClass}
              value={values.email}
              onChange={(e) => setValues((c) => ({ ...c, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input
              className={inputClass}
              value={values.username}
              onChange={(e) => setValues((c) => ({ ...c, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select
              className={inputClass}
              value={values.role}
              onChange={(e) =>
                setValues((c) => ({ ...c, role: e.target.value as UserRole }))
              }
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {managerOptions.length > 0 ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Reports to</label>
              <select
                className={inputClass}
                value={values.manager ?? ""}
                onChange={(e) =>
                  setValues((c) => ({ ...c, manager: e.target.value }))
                }
              >
                <option value="">Select manager</option>
                {managerOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
