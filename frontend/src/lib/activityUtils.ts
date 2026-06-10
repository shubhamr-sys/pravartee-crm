import type { LeadActivity } from "@/types/activity";

const ACTIVITY_ICONS: Record<string, string> = {
  LEAD_CREATED: "✨",
  LEAD_UPDATED: "✏️",
  STAGE_CHANGED: "📊",
  FOLLOWUP_UPDATED: "📅",
  NOTE_ADDED: "📝",
  LEAD_ASSIGNED: "👤",
  LEAD_CLOSED_WON: "🏆",
  LEAD_CLOSED_LOST: "❌",
  PRICE_REQUESTED: "💰",
};

export function getActivityIcon(activityType: string): string {
  return ACTIVITY_ICONS[activityType] ?? "•";
}

export function getActivityActor(activity: LeadActivity): string | null {
  return activity.user_name || activity.user_username || null;
}

export function getActivityChangeSummary(activity: LeadActivity): string | null {
  if (activity.comments?.trim()) {
    return activity.comments.trim();
  }

  if (activity.old_value && activity.new_value) {
    return `${activity.old_value} → ${activity.new_value}`;
  }

  if (activity.new_value) {
    return activity.new_value;
  }

  if (activity.description?.trim()) {
    return activity.description.trim();
  }

  return null;
}
