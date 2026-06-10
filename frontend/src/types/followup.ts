export type FollowUpType =
  | "CALL"
  | "MEETING"
  | "SITE_VISIT"
  | "EMAIL"
  | "TENDER_DISCUSSION";

export type FollowUpStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface FollowUp {
  id: string;
  lead: string;
  assigned_to: string;
  assigned_to_name: string;
  followup_date: string;
  followup_type: FollowUpType;
  followup_type_display: string;
  remarks: string;
  status: FollowUpStatus;
  status_display: string;
  completed_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpFormData {
  assigned_to: string;
  followup_date: string;
  followup_type: FollowUpType;
  remarks: string;
}

export interface StageHistoryEntry {
  id: string;
  lead: string;
  old_stage: string;
  new_stage: string;
  remarks: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface FollowUpDashboardMetrics {
  today_followups: number;
  overdue_followups: number;
  upcoming_followups: number;
}

export const FOLLOW_UP_TYPE_OPTIONS: { value: FollowUpType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "EMAIL", label: "Email" },
  { value: "TENDER_DISCUSSION", label: "Tender Discussion" },
];
