import Link from "next/link";

export default function LeadNotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-5xl" aria-hidden>
        🔍
      </p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Lead not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        This lead may have been deleted or you may not have access to it.
      </p>
      <Link
        href="/leads"
        className="mt-6 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
      >
        Back to Leads
      </Link>
    </div>
  );
}
