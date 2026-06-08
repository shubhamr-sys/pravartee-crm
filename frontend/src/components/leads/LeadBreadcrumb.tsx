import Link from "next/link";

interface LeadBreadcrumbProps {
  customerName?: string;
}

export default function LeadBreadcrumb({ customerName }: LeadBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/dashboard" className="hover:text-teal-700">
            Dashboard
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/leads" className="hover:text-teal-700">
            Leads
          </Link>
        </li>
        {customerName && (
          <>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-slate-700">{customerName}</li>
          </>
        )}
      </ol>
    </nav>
  );
}
