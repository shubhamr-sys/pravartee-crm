"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getValidationToastMessage } from "@/lib/formErrors";
import { useMounted } from "@/hooks/useMounted";
import { getBackendPort, resolveApiBaseUrl } from "@/lib/api";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

export default function LoginForm() {
  const { login } = useAuth();
  const { showErrorToast } = useToast();
  const mounted = useMounted();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!mounted || isSubmitting) return;
    const validationErrors = validate(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showErrorToast(getValidationToastMessage(validationErrors as Record<string, string>));
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;

        if (status === 401) {
          setErrors({
            general:
              "Invalid email or password. Check your credentials and try again (Safari autofill may use an outdated password).",
          });
        } else if (!error.response) {
          setErrors({
            general: `Cannot reach the API at ${resolveApiBaseUrl()}. Make sure the backend is running on port ${getBackendPort()}.`,
          });
        } else if (typeof detail === "string") {
          setErrors({ general: detail });
        } else if (status && status >= 500) {
          setErrors({
            general:
              "The server encountered an error. Try again in a moment or contact support if this continues.",
          });
        } else {
          setErrors({ general: "Unable to sign in. Please try again." });
        }
      } else {
        setErrors({ general: "Unable to sign in. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate action="#">
      {errors.general ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errors.general}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email || errors.general) {
              setErrors((current) => ({
                ...current,
                email: undefined,
                general: undefined,
              }));
            }
          }}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
            errors.email
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
          }`}
          placeholder="you@company.com"
        />
        {errors.email ? (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password || errors.general) {
              setErrors((current) => ({
                ...current,
                password: undefined,
                general: undefined,
              }));
            }
          }}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
            errors.password
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
          }`}
          placeholder="Enter your password"
        />
        {errors.password ? (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        ) : null}
        <p className="mt-2 text-right text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-teal-700 hover:text-teal-800"
          >
            Forgot password?
          </Link>
        </p>
      </div>

      <button
        type="submit"
        disabled={!mounted || isSubmitting}
        className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!mounted ? "Loading..." : isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
