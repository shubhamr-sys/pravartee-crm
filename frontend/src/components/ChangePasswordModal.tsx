"use client";

import { FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/lib/authService";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

interface FormErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  general?: string;
}

function validate(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): FormErrors {
  const errors: FormErrors = {};
  if (!currentPassword) {
    errors.current_password = "Current password is required.";
  }
  if (!newPassword) {
    errors.new_password = "New password is required.";
  } else if (newPassword.length < 8) {
    errors.new_password = "New password must be at least 8 characters.";
  }
  if (!confirmPassword) {
    errors.confirm_password = "Please confirm your new password.";
  } else if (newPassword !== confirmPassword) {
    errors.confirm_password = "Passwords do not match.";
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.new_password = "New password must be different from the current password.";
  }
  return errors;
}

function apiErrorMessage(error: unknown): string {
  if (!isAxiosError(error) || !error.response?.data) {
    return "Unable to change password. Please try again.";
  }
  const data = error.response.data as Record<string, unknown>;
  if (typeof data.detail === "string") {
    return data.detail;
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return "Unable to change password. Please check your inputs.";
}

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(currentPassword, newPassword, confirmPassword);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      onClose();
      await logout();
      router.push("/login?passwordChanged=1");
    } catch (error) {
      setErrors({ general: apiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="change-password-title" className="text-lg font-semibold text-slate-900">
              Change password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              You will be signed out after updating your password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errors.general ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.general}
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="modal_current_password" className="mb-1 block text-sm font-medium">
              Current password
            </label>
            <input
              id="modal_current_password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {errors.current_password ? (
              <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="modal_new_password" className="mb-1 block text-sm font-medium">
              New password
            </label>
            <input
              id="modal_new_password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {errors.new_password ? (
              <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="modal_confirm_password" className="mb-1 block text-sm font-medium">
              Confirm new password
            </label>
            <input
              id="modal_confirm_password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirm_password ? (
              <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
