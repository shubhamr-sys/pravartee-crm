"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAccessToken } from "@/lib/auth";
import {
  fetchSalesMBRReport,
  getSalesMBRExportUrl,
  type SalesMBRQuery,
} from "@/lib/reportsService";
import type { SalesMBRReport } from "@/types/reports";

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

export default function SalesMBRPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [salesperson, setSalesperson] = useState("");
  const [category, setCategory] = useState("");
  const [report, setReport] = useState<SalesMBRReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSalesMBRReport(query);
      setReport(data);
    } catch {
      setError("Unable to load Sales MBR report.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const token = getAccessToken();
      const response = await fetch(getSalesMBRExportUrl(query), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
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
  const products = report?.products;
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
            Monthly Business Review — sales performance and pipeline insights.
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
            <label htmlFor="month" className="mb-1.5 block text-sm font-medium">
              Month
            </label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="mb-1.5 block text-sm font-medium">
              Year
            </label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="salesperson"
              className="mb-1.5 block text-sm font-medium"
            >
              Assignee
            </label>
            <select
              id="salesperson"
              value={salesperson}
              onChange={(e) => setSalesperson(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading report...
        </div>
      )}

      {!isLoading && report && summary && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Sales Performance Summary
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Leads", value: summary.total_leads },
                {
                  label: "Active Pipeline Leads",
                  value: summary.active_pipeline_leads,
                },
                { label: "Won Deals", value: summary.won_deals },
                { label: "Lost Deals", value: summary.lost_deals },
                { label: "Win Rate", value: `${summary.win_rate}%` },
                {
                  label: "Pipeline Product Quantity",
                  value: summary.pipeline_product_quantity,
                },
                {
                  label: "Won Product Quantity",
                  value: summary.won_product_quantity,
                },
                {
                  label: "Avg Products per Won Deal",
                  value: summary.average_products_per_won_deal,
                },
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

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Sales Pipeline</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Count</th>
                    <th className="px-4 py-3 font-medium">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {report.pipeline_by_stage.map((row) => (
                    <tr key={row.stage} className="border-b border-slate-100">
                      <td className="px-4 py-3">{row.stage}</td>
                      <td className="px-4 py-3">{row.count}</td>
                      <td className="px-4 py-3">{row.percentage ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Category Analysis</h2>
            <ProductTable
              headers={["Category", "Lead Count", "Product Quantity", "Pipeline Share"]}
              rows={(report.category_analysis ?? []).map((row) => [
                row.category,
                row.lead_count,
                row.product_quantity,
                `${row.pipeline_share_percentage}%`,
              ])}
              emptyMessage="No category data."
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Product Analysis</h2>
            <ProductTable
              headers={["Product", "Quantity", "Lead Count"]}
              rows={(report.top_products ?? []).map((row) => [
                row.product,
                row.quantity,
                row.lead_count,
              ])}
              emptyMessage="No product data."
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Top Projects
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Product Qty</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {report.top_customers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No projects in the current pipeline.
                      </td>
                    </tr>
                  ) : (
                    report.top_customers.map((row) => (
                      <tr
                        key={`${row.customer}-${row.company}`}
                        className="border-b border-slate-100"
                      >
                        <td className="px-4 py-3">{row.customer}</td>
                        <td className="px-4 py-3">{row.company}</td>
                        <td className="px-4 py-3">{row.product_quantity}</td>
                        <td className="px-4 py-3">{row.stage}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {products && (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Quantity by Product
                </h2>
                <ProductTable
                  headers={["Product", "Category", "Brand", "Quantity"]}
                  rows={(products.quantity_by_product ?? []).map((row) => [
                    row.product,
                    row.category || "—",
                    row.brand || "—",
                    row.quantity,
                  ])}
                  emptyMessage="No product quantity data."
                />
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Quantity by Category
                </h2>
                <ProductTable
                  headers={["Category", "Quantity"]}
                  rows={(products.quantity_by_category ?? []).map((row) => [
                    row.category,
                    row.quantity,
                  ])}
                  emptyMessage="No category quantity data."
                />
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Quantity by Brand
                </h2>
                <ProductTable
                  headers={["Brand", "Quantity"]}
                  rows={(products.quantity_by_brand ?? []).map((row) => [
                    row.brand,
                    row.quantity,
                  ])}
                  emptyMessage="No brand quantity data."
                />
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Top Selling Products
                </h2>
                <ProductTable
                  headers={["Product", "Brand", "Quantity"]}
                  rows={(products.top_selling_products ?? []).map((row) => [
                    row.product,
                    row.brand || "—",
                    row.quantity,
                  ])}
                  emptyMessage="No won deals with products yet."
                />
              </section>
            </>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Salesperson Performance
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Leads Managed</th>
                    <th className="px-4 py-3 font-medium">Won Deals</th>
                    <th className="px-4 py-3 font-medium">Lost Deals</th>
                    <th className="px-4 py-3 font-medium">Pipeline Qty</th>
                    <th className="px-4 py-3 font-medium">Win Rate</th>
                    <th className="px-4 py-3 font-medium">Follow-ups Done</th>
                  </tr>
                </thead>
                <tbody>
                  {report.salesperson_performance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No salesperson data for this period.
                      </td>
                    </tr>
                  ) : (
                    report.salesperson_performance.map((row) => (
                      <tr key={row.user_id} className="border-b border-slate-100">
                        <td className="px-4 py-3">{row.user}</td>
                        <td className="px-4 py-3">{row.leads_managed}</td>
                        <td className="px-4 py-3">{row.won_deals}</td>
                        <td className="px-4 py-3">{row.lost_deals}</td>
                        <td className="px-4 py-3">
                          {row.pipeline_product_quantity}
                        </td>
                        <td className="px-4 py-3">
                          {row.win_rate ?? row.conversion_rate}%
                        </td>
                        <td className="px-4 py-3">
                          {row.followups_completed ?? 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Pricing Requests</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total Requests",
                  value: report.pricing_analysis?.total_pricing_requests ?? 0,
                },
                {
                  label: "Pending",
                  value: report.pricing_analysis?.pending_pricing_requests ?? 0,
                },
                {
                  label: "Responded",
                  value: report.pricing_analysis?.responded_pricing_requests ?? 0,
                },
                {
                  label: "Avg Response (hrs)",
                  value: report.pricing_analysis?.average_response_time_hours ?? "—",
                },
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

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Follow-up Analysis</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Today's Follow-ups",
                  value: report.follow_up_analysis?.today_followups ?? 0,
                },
                {
                  label: "Overdue Follow-ups",
                  value: report.follow_up_analysis?.overdue_followups ?? 0,
                },
                {
                  label: "Completed Follow-ups",
                  value: report.follow_up_analysis?.completed_followups ?? 0,
                },
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
        </>
      )}
    </div>
  );
}
