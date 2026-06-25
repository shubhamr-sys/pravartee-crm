import Link from "next/link";

interface LeadBreadcrumbProps {
  projectName?: string;
}

export default function LeadBreadcrumb({ projectName }: LeadBreadcrumbProps) {
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
        {projectName && (
          <>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-slate-700">{projectName}</li>
          </>
        )}
      </ol>
    </nav>
  );
}
