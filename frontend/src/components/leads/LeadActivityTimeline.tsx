"use client";

import ActivityFeedItem from "@/components/leads/ActivityFeedItem";
import type { LeadActivity } from "@/types/activity";

interface LeadActivityTimelineProps {
  activities: LeadActivity[];
}

export default function LeadActivityTimeline({
  activities,
}: LeadActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-slate-500">No activities recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {activities.map((activity) => (
        <li key={activity.id}>
          <ActivityFeedItem activity={activity} />
        </li>
      ))}
    </ol>
  );
}
