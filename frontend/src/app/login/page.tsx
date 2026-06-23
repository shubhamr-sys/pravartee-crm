"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/context/AuthContext";

function LoginAlerts() {
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "1";
  const passwordReset = searchParams.get("passwordReset") === "1";
  const [showBanner, setShowBanner] = useState(passwordChanged || passwordReset);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      {passwordReset
        ? "Password reset successful. Sign in with your new password."
        : "Password updated. Sign in with your new password."}
      <button
        type="button"
        className="ml-2 font-medium underline"
        onClick={() => setShowBanner(false)}
      >
        Dismiss
      </button>
    </div>
  );
}

function LoginPageContent() {
  const { sessionReady, user } = useAuth();

  useEffect(() => {
    if (!sessionReady || !user) return;
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    window.location.replace(next && next.startsWith("/") ? next : "/dashboard");
  }, [sessionReady, user]);

  if (sessionReady && user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <p className="text-sm text-slate-500">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Pravartee CRM
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your work email and password to continue.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginAlerts />
        </Suspense>

        <LoginForm />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
