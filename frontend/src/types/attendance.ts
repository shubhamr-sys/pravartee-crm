import type { User } from "@/types/user";

export interface AttendanceRecord {
  id: string;
  user: User;
  employee_name: string;
  employee_role: string;
  status?: string;
  attendance_date: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  punch_in_latitude: string | null;
  punch_in_longitude: string | null;
  punch_out_latitude: string | null;
  punch_out_longitude: string | null;
  punch_in_map_url?: string | null;
  punch_out_map_url?: string | null;
  working_hours: string | number | null;
  working_hours_display?: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedAttendanceResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AttendanceRecord[];
}

export interface AttendanceListParams {
  page?: number;
  attendance_date?: string;
  user?: string;
  user__role?: string;
  status?: string;
}

export interface PunchInResponse {
  message: string;
  punch_in_time: string;
}

export interface PunchOutResponse {
  message: string;
  working_hours: string | number;
}

export interface CEOAttendanceMetrics {
  present_today: number;
  absent_today: number;
  total_employees: number;
  average_working_hours: string | number;
  average_working_hours_display?: string;
  pending_corrections?: number;
  pending_corrections_label?: string;
}

export interface SalesHeadAttendanceMetrics {
  team_present: number;
  team_absent: number;
  team_members?: number;
  average_team_working_hours: string | number;
  average_team_working_hours_display?: string;
  pending_corrections?: number;
  pending_corrections_label?: string;
}

export interface SalespersonAttendanceMetrics {
  today_status: string;
  working_hours: string | number | null;
  working_hours_display?: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  pending_corrections?: number;
  my_correction_pending?: boolean;
  pending_corrections_label?: string | null;
}

export interface AttendanceActivity {
  id: string;
  attendance: string;
  user: string | null;
  user_name: string | null;
  activity_type: string;
  activity_label: string;
  old_value: string;
  new_value: string;
  comments: string;
  created_at: string;
}

export interface AttendanceCorrection {
  id: string;
  attendance: string;
  attendance_date: string;
  employee_name: string;
  requested_by: string;
  requested_by_user: User;
  correction_type: string;
  correction_type_label: string;
  requested_punch_in_time: string | null;
  requested_punch_out_time: string | null;
  reason: string;
  status: string;
  status_label: string;
  approved_by: string | null;
  approved_by_user: User | null;
  approved_at: string | null;
  rejection_reason: string;
  can_approve: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedCorrectionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AttendanceCorrection[];
}

export interface CreateCorrectionPayload {
  attendance: string;
  correction_type: string;
  reason: string;
  requested_punch_in_time?: string;
  requested_punch_out_time?: string;
}

export type AttendanceMetrics =
  | CEOAttendanceMetrics
  | SalesHeadAttendanceMetrics
  | SalespersonAttendanceMetrics;
