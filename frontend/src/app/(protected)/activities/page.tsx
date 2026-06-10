"use client";

import { useCallback, useEffect, useState } from "react";

import ActivityFeedItem from "@/components/leads/ActivityFeedItem";
import { TableSkeleton } from "@/components/leads/LoadingSkeleton";
import {
  EmptyState,
  ErrorState,
} from "@/components/leads/StatusMessage";
import { fetchRecentActivities } from "@/lib/activityService";
import type { LeadActivity } from "@/types/activity";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRecentActivities();
      setActivities(data.results);
    } catch {
      setError("Unable to load activities.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activities</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recent lead activity across your visible pipeline.
        </p>
      </div>

      {isLoading && <TableSkeleton rows={4} />}
      {!isLoading && error && <ErrorState message={error} onRetry={loadActivities} />}
      {!isLoading && !error && activities.length === 0 && (
        <EmptyState message="No activities recorded yet." />
      )}

      {!isLoading && !error && activities.length > 0 && (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li key={activity.id}>
              <ActivityFeedItem activity={activity} showLeadLink />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
