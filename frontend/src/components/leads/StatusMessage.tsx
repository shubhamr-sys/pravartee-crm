import Link from "next/link";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-12">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
