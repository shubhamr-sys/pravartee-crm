"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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

export default function ChangePasswordPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(currentPassword, newPassword, confirmPassword);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSuccess(null);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccess(null);
    try {
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(response.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await logout();
      router.push("/login?passwordChanged=1");
    } catch (error) {
      setErrors({ general: apiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-teal-700 hover:text-teal-800">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Change password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your login password. You will be signed out and asked to sign in again.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        {errors.general && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.general}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="current_password" className="mb-1 block text-sm font-medium">
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {errors.current_password && (
              <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
            )}
          </div>

          <div>
            <label htmlFor="new_password" className="mb-1 block text-sm font-medium">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {errors.new_password && (
              <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium">
              Confirm new password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirm_password && (
              <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
