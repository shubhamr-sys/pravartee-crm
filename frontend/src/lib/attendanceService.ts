import { api } from "@/lib/api";
import type { GeoPosition } from "@/lib/geolocation";
import type {
  AttendanceListParams,
  AttendanceMetrics,
  AttendanceRecord,
  PaginatedAttendanceResponse,
  PunchInResponse,
  PunchOutResponse,
} from "@/types/attendance";
import type { AssignableUser } from "@/types/lead";

export async function punchIn(position: GeoPosition): Promise<PunchInResponse> {
  const { data } = await api.post<PunchInResponse>("/api/v1/attendance/punch-in/", {
    latitude: position.latitude,
    longitude: position.longitude,
  });
  return data;
}

export async function punchOut(position: GeoPosition): Promise<PunchOutResponse> {
  const { data } = await api.post<PunchOutResponse>("/api/v1/attendance/punch-out/", {
    latitude: position.latitude,
    longitude: position.longitude,
  });
  return data;
}

export async function fetchAttendanceSummary(): Promise<AttendanceMetrics> {
  const { data } = await api.get<AttendanceMetrics>("/api/v1/attendance/summary/");
  return data;
}

export async function fetchAttendance(
  params: AttendanceListParams = {},
): Promise<PaginatedAttendanceResponse> {
  const { data } = await api.get<PaginatedAttendanceResponse>(
    "/api/v1/attendance/",
    { params },
  );
  return data;
}

export async function fetchMyAttendance(
  page = 1,
): Promise<PaginatedAttendanceResponse> {
  const { data } = await api.get<PaginatedAttendanceResponse>(
    "/api/v1/attendance/me/",
    { params: { page } },
  );
  return data;
}

export async function fetchAttendanceUsers(): Promise<AssignableUser[]> {
  const { data } = await api.get<AssignableUser[]>("/api/v1/attendance/users/");
  return data;
}

export async function fetchEmployeeMonthlyAttendance(
  userId: string,
  year: number,
  month: number,
): Promise<AttendanceRecord[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  const { data } = await api.get<PaginatedAttendanceResponse>(
    "/api/v1/attendance/",
    {
      params: {
        user: userId,
        attendance_date__gte: start,
        attendance_date__lte: end,
        page_size: 100,
      },
    },
  );
  return data.results;
}

export function getTodayRecord(
  records: AttendanceRecord[],
): AttendanceRecord | null {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return records.find((record) => record.attendance_date === key) ?? null;
}
