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

export interface AttendanceEmployeeSummary {
  id: string;
  name: string;
  role: string;
  status: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
}

export interface CEOAttendanceMetrics {
  present_today: number;
  absent_today: number;
  total_employees: number;
  average_working_hours: string | number;
  average_working_hours_display?: string;
  present_employees?: AttendanceEmployeeSummary[];
  absent_employees?: AttendanceEmployeeSummary[];
}

export interface SalesHeadAttendanceMetrics {
  team_present: number;
  team_absent: number;
  team_members?: number;
  average_team_working_hours: string | number;
  average_team_working_hours_display?: string;
  present_employees?: AttendanceEmployeeSummary[];
  absent_employees?: AttendanceEmployeeSummary[];
}

export type AttendanceStatusView = "present" | "absent";

export interface SalespersonAttendanceMetrics {
  today_status: string;
  working_hours: string | number | null;
  working_hours_display?: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
}

export type AttendanceMetrics =
  | CEOAttendanceMetrics
  | SalesHeadAttendanceMetrics
  | SalespersonAttendanceMetrics;
