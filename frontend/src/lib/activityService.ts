import { api } from "@/lib/api";
import type { LeadActivity, PaginatedActivitiesResponse } from "@/types/activity";

export async function fetchRecentActivities(
  page = 1,
): Promise<PaginatedActivitiesResponse> {
  const { data } = await api.get<PaginatedActivitiesResponse>(
    "/api/v1/activities/",
    { params: { page } },
  );
  return data;
}

export async function fetchLeadActivities(
  leadId: string,
): Promise<LeadActivity[]> {
  const { data } = await api.get<LeadActivity[] | PaginatedActivitiesResponse>(
    `/api/v1/activities/lead/${leadId}/`,
  );
  return Array.isArray(data) ? data : data.results;
}
