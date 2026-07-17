"use client";

import type { VisitActivity } from "@/types/visit";

interface VisitActivityTimelineProps {
  activities: VisitActivity[];
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityIcon(type: string): string {
  if (type === "CHECK_IN") return "📍";
  if (type === "CHECK_OUT") return "✅";
  return "📝";
}

export default function VisitActivityTimeline({
  activities,
}: VisitActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-slate-500">No activity recorded for this visit yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
        >
          <span className="text-lg leading-none" aria-hidden>
            {activityIcon(activity.activity_type)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {activity.activity_label}
              </p>
              <time className="text-xs text-slate-500">
                {formatDateTime(activity.created_at)}
              </time>
            </div>
            {activity.comments ? (
              <p className="mt-1 text-sm text-slate-700">{activity.comments}</p>
            ) : null}
            {activity.user_name ? (
              <p className="mt-1 text-xs text-slate-500">By {activity.user_name}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
