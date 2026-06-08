"use client";

import LocationDisplay from "@/components/attendance/LocationDisplay";
import StatusBadge from "@/components/attendance/StatusBadge";
import {
  formatWorkingHoursDisplay,
  getAttendanceStatus,
} from "@/lib/attendanceUtils";
import { formatDate, formatTime } from "@/lib/format";
import { getRoleLabel } from "@/lib/navigation";
import type { AttendanceRecord } from "@/types/attendance";
import type { UserRole } from "@/types/user";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  showRole?: boolean;
}

export default function AttendanceTable({
  records,
  showRole = false,
}: AttendanceTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Employee Name
              </th>
              {showRole && (
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Role
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Punch In
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Punch In Location
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Punch Out
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Punch Out Location
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Working Hours
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => {
              const status = record.status ?? getAttendanceStatus(record);
              return (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {record.employee_name}
                  </td>
                  {showRole && (
                    <td className="px-4 py-3 text-slate-700">
                      {getRoleLabel(record.employee_role as UserRole)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(record.attendance_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatTime(record.punch_in_time)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <LocationDisplay
                      latitude={record.punch_in_latitude}
                      longitude={record.punch_in_longitude}
                      mapUrl={record.punch_in_map_url}
                      className="text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatTime(record.punch_out_time)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <LocationDisplay
                      latitude={record.punch_out_latitude}
                      longitude={record.punch_out_longitude}
                      mapUrl={record.punch_out_map_url}
                      className="text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {record.working_hours_display ??
                      formatWorkingHoursDisplay(record.working_hours)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
