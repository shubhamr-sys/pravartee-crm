import type { LeadActivity } from "@/types/activity";

const ACTIVITY_ICONS: Record<string, string> = {
  LEAD_CREATED: "✨",
  LEAD_UPDATED: "✏️",
  STAGE_CHANGED: "📊",
  FOLLOWUP_UPDATED: "📅",
  FOLLOWUP_SCHEDULED: "📅",
  FOLLOWUP_COMPLETED: "✅",
  NOTE_ADDED: "📝",
  LEAD_ASSIGNED: "👤",
  LEAD_CLOSED_WON: "🏆",
  LEAD_CLOSED_LOST: "❌",
  PRICE_REQUESTED: "💰",
  PRICING_RESPONSE_RECEIVED: "📥",
  VENDOR_QUOTE_UPLOADED: "📎",
  QUOTATION_GENERATED: "📄",
  GUT_FEELING_UPDATED: "🎯",
  EXPENSE_SUBMITTED: "🧾",
  EXPENSE_APPROVED: "✅",
  EXPENSE_REJECTED: "🚫",
};

export function getActivityIcon(
  activityType: string,
  activityLabel?: string,
): string {
  if (ACTIVITY_ICONS[activityType]) {
    return ACTIVITY_ICONS[activityType];
  }

  if (activityType.startsWith("FOLLOWUP_")) {
    return activityType === "FOLLOWUP_COMPLETED" ? "✅" : "📅";
  }

  const labelIcons: Record<string, string> = {
    "Follow-up Scheduled": "📅",
    "Follow-up Updated": "📅",
    "Follow-up Completed": "✅",
  };
  if (activityLabel && labelIcons[activityLabel]) {
    return labelIcons[activityLabel];
  }

  return "•";
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
