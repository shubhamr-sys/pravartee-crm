import { api } from "@/lib/api";
import type { LeadDocument } from "@/types/lead";

export const LEAD_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const LEAD_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
]);

export function validateLeadDocumentFile(file: File): string | null {
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return "Unsupported file type. Use PDF, Word, Excel, or image files.";
  }
  if (file.size > LEAD_DOCUMENT_MAX_SIZE_BYTES) {
    return "Document must be 5 MB or smaller.";
  }
  return null;
}

export async function fetchLeadDocuments(leadId: string): Promise<LeadDocument[]> {
  const { data } = await api.get<LeadDocument[]>(`/api/v1/leads/${leadId}/documents/`);
  return data;
}

export async function uploadLeadDocument(
  leadId: string,
  file: File,
): Promise<LeadDocument> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<LeadDocument>(
    `/api/v1/leads/${leadId}/documents/`,
    formData,
  );
  return data;
}

export async function uploadLeadDocuments(
  leadId: string,
  files: File[],
): Promise<LeadDocument[]> {
  const uploads = await Promise.all(files.map((file) => uploadLeadDocument(leadId, file)));
  return uploads;
}

export async function deleteLeadDocument(leadId: string, documentId: string): Promise<void> {
  await api.delete(`/api/v1/leads/${leadId}/documents/${documentId}/`);
}

export function formatDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
