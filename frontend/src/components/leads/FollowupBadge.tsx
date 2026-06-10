import { getFollowupStatus, type FollowupStatus } from "@/lib/leadUtils";

interface FollowupBadgeProps {
  followupDate: string | null | undefined;
  status?: FollowupStatus;
}

export default function FollowupBadge({ followupDate, status }: FollowupBadgeProps) {
  const followupStatus = getFollowupStatus(followupDate, status);

  if (followupStatus === "overdue") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
        Overdue
      </span>
    );
  }

  if (followupStatus === "due_soon") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Due Soon
      </span>
    );
  }

  return null;
}
