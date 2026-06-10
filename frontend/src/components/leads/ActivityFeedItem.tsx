"use client";

import Link from "next/link";

import {
  getActivityActor,
  getActivityChangeSummary,
  getActivityIcon,
} from "@/lib/activityUtils";
import { formatDateTime } from "@/lib/format";
import type { LeadActivity } from "@/types/activity";

interface ActivityFeedItemProps {
  activity: LeadActivity;
  showLeadLink?: boolean;
}

export default function ActivityFeedItem({
  activity,
  showLeadLink = false,
}: ActivityFeedItemProps) {
  const changeSummary = getActivityChangeSummary(activity);
  const actor = getActivityActor(activity);

  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-lg leading-none" aria-hidden>
        {getActivityIcon(activity.activity_type)}
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

        {showLeadLink && activity.lead_customer_name && (
          <p className="mt-1 text-sm text-slate-700">
            <Link
              href={`/leads/${activity.lead}`}
              className="font-medium text-teal-700 hover:text-teal-800"
            >
              {activity.lead_customer_name}
            </Link>
          </p>
        )}

        {changeSummary && (
          <p className="mt-1 text-sm text-slate-700">{changeSummary}</p>
        )}

        {actor && (
          <p className="mt-1 text-xs text-slate-500">By {actor}</p>
        )}
      </div>
    </div>
  );
}
