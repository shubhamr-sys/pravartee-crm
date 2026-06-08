"use client";

import type { AssignableUser } from "@/types/lead";

interface AttendanceFiltersProps {
  date: string;
  role: string;
  userId: string;
  status: string;
  users: AssignableUser[];
  showRoleFilter: boolean;
  showUserFilter: boolean;
  showStatusFilter: boolean;
  onDateChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "CEO", label: "CEO" },
  { value: "SALES_HEAD", label: "Sales Head" },
  { value: "SALESPERSON", label: "Salesperson" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "present", label: "Present" },
  { value: "in_progress", label: "In Progress" },
  { value: "incomplete", label: "Incomplete" },
  { value: "absent", label: "Absent" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function AttendanceFilters({
  date,
  role,
  userId,
  status,
  users,
  showRoleFilter,
  showUserFilter,
  showStatusFilter,
  onDateChange,
  onRoleChange,
  onUserChange,
  onStatusChange,
}: AttendanceFiltersProps) {
  const visibleFilters = [
    true,
    showRoleFilter,
    showUserFilter,
    showStatusFilter,
  ].filter(Boolean).length;

  const gridClass =
    visibleFilters >= 4
      ? "md:grid-cols-4"
      : visibleFilters === 3
        ? "md:grid-cols-3"
        : visibleFilters === 2
          ? "md:grid-cols-2"
          : "md:grid-cols-1";

  return (
    <div
      className={`grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${gridClass}`}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      {showRoleFilter && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            className={inputClass}
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {showUserFilter && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">User</label>
          <select
            className={inputClass}
            value={userId}
            onChange={(e) => onUserChange(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </div>
      )}
      {showStatusFilter && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
