"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

function toastStyles(type: ToastType): string {
  if (type === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (type === "success") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }
  return "border-slate-200 bg-white text-slate-700";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    },
    [removeToast],
  );

  const showErrorToast = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );

  const showSuccessToast = useCallback(
    (message: string) => showToast(message, "success"),
    [showToast],
  );

  const value = useMemo(
    () => ({ showToast, showErrorToast, showSuccessToast }),
    [showToast, showErrorToast, showSuccessToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="alert"
                className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${toastStyles(toast.type)}`}
              >
                {toast.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
