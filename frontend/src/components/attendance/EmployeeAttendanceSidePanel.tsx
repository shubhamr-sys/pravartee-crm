"use client";

import AttendanceCalendarView from "@/components/attendance/AttendanceCalendarView";
import { getRoleLabel } from "@/lib/navigation";
import type { AttendanceEmployeeSummary } from "@/types/attendance";

interface EmployeeAttendanceSidePanelProps {
  employee: AttendanceEmployeeSummary;
  refreshKey?: number;
  onClose: () => void;
}

export default function EmployeeAttendanceSidePanel({
  employee,
  refreshKey = 0,
  onClose,
}: EmployeeAttendanceSidePanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 z-40 bg-slate-900/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{employee.name}</h2>
            <p className="text-sm text-slate-500">
              {getRoleLabel(employee.role as "CEO" | "SALES_HEAD" | "SALESPERSON")} · Monthly
              attendance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <AttendanceCalendarView
            embedded
            lockUserId={employee.id}
            employeeName={employee.name}
            refreshKey={refreshKey}
          />
        </div>
      </aside>
    </>
  );
}
