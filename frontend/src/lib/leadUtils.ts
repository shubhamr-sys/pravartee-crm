import type { FollowupStatus } from "@/types/lead";

const DUE_SOON_DAYS = 3;

export type { FollowupStatus };

export function getFollowupStatus(
  followupDate: string | null | undefined,
  status?: FollowupStatus,
): FollowupStatus {
  if (status && status !== "none") {
    return status;
  }
  if (!followupDate) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followupDate.includes("T") ? followupDate : `${followupDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  if (due < today) return "overdue";

  const dueSoon = new Date(today);
  dueSoon.setDate(dueSoon.getDate() + DUE_SOON_DAYS);
  if (due <= dueSoon) return "due_soon";

  return "normal";
}
