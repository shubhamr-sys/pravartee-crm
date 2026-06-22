import { api } from "@/lib/api";
import type { FollowUp, FollowUpCompleteData, FollowUpFormData, StageHistoryEntry } from "@/types/followup";

export async function fetchLeadFollowUps(leadId: string): Promise<FollowUp[]> {
  const { data } = await api.get<FollowUp[]>(
    `/api/v1/leads/${leadId}/follow-ups/`,
  );
  return data;
}

export async function createFollowUp(
  leadId: string,
  values: FollowUpFormData,
): Promise<FollowUp> {
  const { data } = await api.post<FollowUp>(
    `/api/v1/leads/${leadId}/follow-ups/`,
    values,
  );
  return data;
}

export async function updateFollowUp(
  leadId: string,
  followUpId: string,
  values: Partial<FollowUpFormData>,
): Promise<FollowUp> {
  const { data } = await api.patch<FollowUp>(
    `/api/v1/leads/${leadId}/follow-ups/${followUpId}/`,
    values,
  );
  return data;
}

export async function completeFollowUp(
  leadId: string,
  followUpId: string,
  values: FollowUpCompleteData,
): Promise<FollowUp> {
  const { data } = await api.post<FollowUp>(
    `/api/v1/leads/${leadId}/follow-ups/${followUpId}/complete/`,
    values,
  );
  return data;
}

export async function fetchLeadStageHistory(
  leadId: string,
): Promise<StageHistoryEntry[]> {
  const { data } = await api.get<StageHistoryEntry[]>(
    `/api/v1/leads/${leadId}/stage-history/`,
  );
  return data;
}
