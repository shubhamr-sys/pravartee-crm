"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formFieldClassLg, formLabelClass } from "@/lib/formStyles";
import {
  downloadSalesMBRExport,
  fetchSalesMBRReport,
  type SalesMBRQuery,
} from "@/lib/reportsService";
import type { SalesMBRReport, SalesSegmentPerformance } from "@/types/reports";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function formatInr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}%`;
}

function ProductTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: (string | number)[][];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-6 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="border-b border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500">{children}</p>;
}

function performanceMetricRows(perf: {
  trading: SalesSegmentPerformance;
  solutions: SalesSegmentPerformance;
  total: SalesSegmentPerformance;
}) {
  const { trading: t, solutions: s, total } = perf;
  return [
    [
      "Order Booking",
      formatInr(t.order_booking),
      formatInr(s.order_booking),
      formatInr(total.order_booking),
      formatInr(total.order_booking_target),
      formatPct(total.order_booking_var_pct),
    ],
    [
      "Revenue / Billing",
      formatInr(t.revenue),
      formatInr(s.revenue),
      formatInr(total.revenue),
      formatInr(total.revenue_target),
      formatPct(total.revenue_var_pct),
    ],
    [
      "Gross Margin (₹)",
      formatInr(t.gross_margin),
      formatInr(s.gross_margin),
      formatInr(total.gross_margin),
      formatInr(total.gross_margin_target),
      formatPct(total.gross_margin_var_pct),
    ],
    [
      "Gross Margin %",
      formatPct(t.gross_margin_pct),
      formatPct(s.gross_margin_pct),
      formatPct(total.gross_margin_pct),
      "—",
      "—",
    ],
    [
      "No. of Deals Won",
      t.deals_won,
      s.deals_won,
      total.deals_won,
      total.deals_won_target,
      "—",
    ],
    [
      "Avg Deal Size (₹)",
      formatInr(t.avg_deal_size),
      formatInr(s.avg_deal_size),
      formatInr(total.avg_deal_size),
      "—",
      "—",
    ],
  ];
}

export default function SalesMBRPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [salesperson, setSalesperson] = useState("");
  const [category, setCategory] = useState("");
  const [report, setReport] = useState<SalesMBRReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const hasLoadedRef = useRef(false);

  const query = useMemo<SalesMBRQuery>(
    () => ({
      year,
      month,
      salesperson: salesperson || undefined,
      category: category || undefined,
    }),
    [year, month, salesperson, category],
  );

  const loadReport = useCallback(async () => {
    setError(null);
    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await fetchSalesMBRReport(query);
      setReport(data);
      hasLoadedRef.current = true;
    } catch {
      setError("Unable to load Sales MBR report.");
      if (!hasLoadedRef.current) setReport(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function handleExport() {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await downloadSalesMBRExport(query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const monthName = report?.filters.month_name ?? "Report";
      link.download = `Sales_MBR_${monthName}_${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to export Excel file.");
    } finally {
      setIsExporting(false);
    }
  }

  const summary = report?.performance_summary;
  const perf = report?.sales_performance;
  const pipeline = report?.forward_pipeline;
  const periodLabel =
    report?.metric_scopes?.period ?? `${MONTHS[month - 1]?.label} ${year}`;
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Reports
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Sales MBR Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aligned to Sales Reporting Pack — booking, billing, margin, pipeline, and
            lost deals for {periodLabel}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isLoading || isExporting || !report}
          className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Exporting..." : "Export Excel"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="month" className={formLabelClass}>
              Month
            </label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={formFieldClassLg}
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className={formLabelClass}>
              Year
            </label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={formFieldClassLg}
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="salesperson" className={formLabelClass}>
              Assignee
            </label>
            <select
              id="salesperson"
              value={salesperson}
              onChange={(e) => setSalesperson(e.target.value)}
              className={formFieldClassLg}
            >
              <option value="">All assignees</option>
              {report?.salespeople.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category" className={formLabelClass}>
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={formFieldClassLg}
            >
              <option value="">All categories</option>
              {report?.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isRefreshing ? (
          <p className="mt-3 text-xs font-medium text-teal-700">Updating report…</p>
        ) : null}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && !report && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading report...
        </div>
      )}

      {report && summary && (
        <div className={isRefreshing ? "opacity-70 transition-opacity" : undefined}>
          {perf ? (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  1. Sales Performance Summary (₹)
                </h2>
                <SectionHint>
                  Won deals in {periodLabel}. Set deal value / billed / margin on leads;
                  targets via Django admin (Sales monthly targets).
                </SectionHint>
              </div>
              <ProductTable
                headers={[
                  "Metric",
                  "Trading",
                  "Solutions",
                  "Total (Month)",
                  "Target (Month)",
                  "Var %",
                ]}
                rows={performanceMetricRows(perf)}
                emptyMessage="No won-deal commercial data for this period."
              />
            </section>
          ) : null}

          <section className="mt-6 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                2. Top Customers (by Revenue)
              </h2>
              <SectionHint>Won deals in {periodLabel}, ranked by billed amount.</SectionHint>
            </div>
            <ProductTable
              headers={[
                "Customer",
                "Segment",
                "Revenue (₹)",
                "Gross Margin (₹)",
                "GM %",
                "Collection",
              ]}
              rows={(report.top_customers_by_revenue ?? []).map((row) => [
                row.customer,
                row.segment_display,
                formatInr(row.revenue),
                formatInr(row.gross_margin),
                formatPct(row.gross_margin_pct),
                row.collection_status,
              ])}
              emptyMessage="No won deals with revenue in this period."
            />
          </section>

          <section className="mt-6 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                3. Sales Pipeline (forward-looking)
              </h2>
              <SectionHint>
                Open pipeline snapshot. Weighted = deal value × gut feeling %. Total
                value {formatInr(pipeline?.total_pipeline_value)} · Weighted{" "}
                {formatInr(pipeline?.total_weighted_pipeline)}.
              </SectionHint>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Opportunity</th>
                    <th className="px-4 py-3 font-medium">Segment</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Value (₹)</th>
                    <th className="px-4 py-3 font-medium">Win %</th>
                    <th className="px-4 py-3 font-medium">Weighted (₹)</th>
                    <th className="px-4 py-3 font-medium">Exp. Close</th>
                  </tr>
                </thead>
                <tbody>
                  {(pipeline?.opportunities ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No open pipeline opportunities.
                      </td>
                    </tr>
                  ) : (
                    (pipeline?.opportunities ?? []).map((row) => (
                      <tr key={row.lead_id} className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <Link
                            href={`/leads/${row.lead_id}`}
                            className="font-medium text-teal-700 hover:text-teal-800"
                          >
                            {row.customer}
                          </Link>
                          <p className="text-xs text-slate-500">{row.company}</p>
                        </td>
                        <td className="px-4 py-3">{row.segment_display}</td>
                        <td className="px-4 py-3">{row.stage}</td>
                        <td className="px-4 py-3">{formatInr(row.value)}</td>
                        <td className="px-4 py-3">{row.win_probability || "—"}</td>
                        <td className="px-4 py-3">{formatInr(row.weighted_value)}</td>
                        <td className="px-4 py-3">{row.expected_close_month}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                4. Lost / Slipped Deals
              </h2>
              <SectionHint>Deals closed lost in {periodLabel}.</SectionHint>
            </div>
            <ProductTable
              headers={[
                "Customer",
                "Value (₹)",
                "Stage Lost",
                "Reason",
                "Competitor",
                "Recovery Action",
              ]}
              rows={(report.lost_deals ?? []).map((row) => [
                row.customer,
                formatInr(row.value),
                row.stage_lost,
                row.reason,
                row.competitor,
                row.recovery_action,
              ])}
              emptyMessage="No lost deals in this period."
            />
          </section>

          <section className="mt-6 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ops snapshot</h2>
              <SectionHint>Lead funnel metrics retained from CRM operations.</SectionHint>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Leads created (period)", value: summary.total_leads },
                { label: "Open pipeline leads", value: summary.active_pipeline_leads },
                { label: "Won / Lost", value: `${summary.won_deals} / ${summary.lost_deals}` },
                { label: "Win rate", value: `${summary.win_rate}%` },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Salesperson Performance
            </h2>
            <ProductTable
              headers={[
                "User",
                "Leads Managed",
                "Won",
                "Lost",
                "Pipeline Qty",
                "Win Rate",
                "Follow-ups Done",
              ]}
              rows={report.salesperson_performance.map((row) => [
                row.user,
                row.leads_managed,
                row.won_deals,
                row.lost_deals,
                row.pipeline_product_quantity,
                `${row.win_rate ?? row.conversion_rate}%`,
                row.followups_completed ?? 0,
              ])}
              emptyMessage="No salesperson data for this filter."
            />
          </section>
        </div>
      )}
    </div>
  );
}
