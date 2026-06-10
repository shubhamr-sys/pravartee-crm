"use client";

export type AttendanceViewMode = "calendar" | "table";

interface AttendanceViewToggleProps {
  value: AttendanceViewMode;
  onChange: (value: AttendanceViewMode) => void;
}

export default function AttendanceViewToggle({
  value,
  onChange,
}: AttendanceViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Attendance view"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
    >
      <button
        type="button"
        aria-pressed={value === "calendar"}
        onClick={() => onChange("calendar")}
        className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
          value === "calendar"
            ? "bg-white text-teal-800 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Calendar View
      </button>
      <button
        type="button"
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
        className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
          value === "table"
            ? "bg-white text-teal-800 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Table View
      </button>
    </div>
  );
}
