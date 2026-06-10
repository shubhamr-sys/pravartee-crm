"use client";

import type { LeadRecordType } from "@/types/lead";

interface LeadVisitToggleProps {
  value: LeadRecordType;
  onChange: (value: LeadRecordType) => void;
  disabled?: boolean;
}

const options: { value: LeadRecordType; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "VISIT", label: "Visit" },
];

export default function LeadVisitToggle({
  value,
  onChange,
  disabled = false,
}: LeadVisitToggleProps) {
  return (
    <div
      role="group"
      aria-label="Record type"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
