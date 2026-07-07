export interface LeadActivity {
  id: string;
  lead: string;
  lead_customer_name?: string;
  lead_company_name?: string;
  user: string | null;
  user_name: string | null;
  user_username?: string | null;
  activity_type: string;
  activity_label: string;
  description: string;
  old_value: string;
  new_value: string;
  comments: string;
  created_at: string;
}

export interface PaginatedActivitiesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LeadActivity[];
}
