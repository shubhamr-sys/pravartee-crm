import type { User } from "@/types/user";

export type VisitStatus = "IN_PROGRESS" | "COMPLETED";

export type VisitActivityType = "CHECK_IN" | "CHECK_OUT" | "NOTE";

export interface VisitActivity {
  id: string;
  activity_type: VisitActivityType;
  activity_label: string;
  comments: string;
  user: string | null;
  user_name: string | null;
  created_at: string;
}

export interface FieldVisit {
  id: string;
  user: User;
  employee_name: string;
  department_name: string;
  contact_person: string;
  mobile: string;
  designation: string;
  purpose: string;
  status: VisitStatus;
  status_display: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_latitude: string;
  check_in_longitude: string;
  check_out_latitude: string | null;
  check_out_longitude: string | null;
  check_in_map_url?: string | null;
  check_out_map_url?: string | null;
  duration_hours: string | number | null;
  notes: string;
  activities?: VisitActivity[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedVisitResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FieldVisit[];
}

export interface VisitActionResponse {
  message: string;
  visit: FieldVisit;
}
