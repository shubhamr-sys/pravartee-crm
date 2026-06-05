"use client";

import { formatDateTime } from "@/lib/format";
import type { AttendanceActivity } from "@/types/attendance";

interface AttendanceTimelineProps {
  activities: AttendanceActivity[];
}

export default function AttendanceTimeline({ activities }: AttendanceTimelineProps) {
  if (activities.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Attendance Timeline</h2>
      <ol className="mt-4 space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="border-l-2 border-teal-200 pl-4">
            <p className="text-sm font-medium text-slate-900">
              {activity.activity_label}
            </p>
            <p className="text-xs text-slate-500">
              {formatDateTime(activity.created_at)}
              {activity.user_name ? ` · ${activity.user_name}` : ""}
            </p>
            {activity.comments && (
              <p className="mt-1 text-sm text-slate-700">{activity.comments}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
