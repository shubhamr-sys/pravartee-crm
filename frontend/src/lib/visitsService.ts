import { api } from "@/lib/api";
import type { GeoPosition } from "@/lib/geolocation";
import type {
  FieldVisit,
  PaginatedVisitResponse,
  VisitActionResponse,
  VisitStatus,
} from "@/types/visit";

export async function fetchActiveVisit(): Promise<FieldVisit | null> {
  const { data } = await api.get<{ visit: FieldVisit | null }>("/api/v1/visits/active/");
  return data.visit;
}

export async function fetchMyVisits(page = 1): Promise<PaginatedVisitResponse> {
  const { data } = await api.get<PaginatedVisitResponse>("/api/v1/visits/me/", {
    params: { page },
  });
  return data;
}

export async function fetchVisits(params: {
  page?: number;
  status?: VisitStatus | "";
  search?: string;
  user?: string;
} = {}): Promise<PaginatedVisitResponse> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.status) query.status = params.status;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.user) query.user = params.user;

  const { data } = await api.get<PaginatedVisitResponse>("/api/v1/visits/", {
    params: Object.keys(query).length > 0 ? query : undefined,
  });
  return data;
}

export async function checkInVisit(payload: {
  department_name: string;
  contact_person: string;
  mobile: string;
  designation?: string;
  purpose?: string;
  position: GeoPosition;
}): Promise<VisitActionResponse> {
  const { data } = await api.post<VisitActionResponse>("/api/v1/visits/check-in/", {
    department_name: payload.department_name,
    contact_person: payload.contact_person,
    mobile: payload.mobile,
    designation: payload.designation ?? "",
    purpose: payload.purpose ?? "",
    latitude: payload.position.latitude,
    longitude: payload.position.longitude,
  });
  return data;
}

export async function checkOutVisit(payload: {
  position: GeoPosition;
  notes?: string;
}): Promise<VisitActionResponse> {
  const { data } = await api.post<VisitActionResponse>("/api/v1/visits/check-out/", {
    latitude: payload.position.latitude,
    longitude: payload.position.longitude,
    notes: payload.notes ?? "",
  });
  return data;
}
