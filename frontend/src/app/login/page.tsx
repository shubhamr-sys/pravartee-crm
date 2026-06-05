"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
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
        <LoginForm />
      </div>
    </div>
  );
}
