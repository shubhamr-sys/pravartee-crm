"use client";

import { useRef, useState } from "react";

import {
  LEAD_DOCUMENT_ACCEPT,
  LEAD_DOCUMENT_MAX_SIZE_BYTES,
  deleteLeadDocument,
  formatDocumentSize,
  uploadLeadDocument,
  validateLeadDocumentFile,
} from "@/lib/leadDocumentsService";
import {
  getSolutionCategoryId,
  hasSolutionLineItems,
} from "@/lib/productCategories";
import type { LeadDocument, LeadItemFormData, ProductCategory } from "@/types/lead";

interface LeadDocumentsSectionProps {
  leadId?: string;
  items: LeadItemFormData[];
  categories: ProductCategory[];
  documents: LeadDocument[];
  pendingDocuments: File[];
  disabled?: boolean;
  onDocumentsChange?: (documents: LeadDocument[]) => void;
  onPendingDocumentsChange: (files: File[]) => void;
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect
        x="10"
        y="6"
        width="28"
        height="36"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 16h16M16 22h12M16 28h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M30 34l4 4m0 0l4-4m-4 4V26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LeadDocumentsSection({
  leadId,
  items,
  categories,
  documents,
  pendingDocuments,
  disabled = false,
  onDocumentsChange,
  onPendingDocumentsChange,
}: LeadDocumentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solutionCategoryId = getSolutionCategoryId(categories);
  const showSection = hasSolutionLineItems(items, solutionCategoryId);

  if (!showSection) {
    return null;
  }

  async function handleSelectedFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    setError(null);
    for (const file of files) {
      const validationError = validateLeadDocumentFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (leadId) {
      setIsUploading(true);
      try {
        const uploaded: LeadDocument[] = [];
        for (const file of files) {
          uploaded.push(await uploadLeadDocument(leadId, file));
        }
        onDocumentsChange?.([...documents, ...uploaded]);
      } catch {
        setError("Unable to upload document. Please try again.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      return;
    }

    onPendingDocumentsChange([...pendingDocuments, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleRemoveDocument(documentId: string) {
    if (!leadId) return;
    setError(null);
    try {
      await deleteLeadDocument(leadId, documentId);
      onDocumentsChange?.(documents.filter((document) => document.id !== documentId));
    } catch {
      setError("Unable to remove document.");
    }
  }

  function handleRemovePending(index: number) {
    onPendingDocumentsChange(pendingDocuments.filter((_, i) => i !== index));
  }

  const hasFiles = documents.length > 0 || pendingDocuments.length > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Solution Documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload drawings, BOQs, site surveys, or other files for Solution category
          products.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={LEAD_DOCUMENT_ACCEPT}
        className="sr-only"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length) {
            void handleSelectedFiles(files);
          }
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled || isUploading) return;
          if (event.dataTransfer.files.length) {
            void handleSelectedFiles(event.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging
            ? "border-teal-500 bg-teal-50"
            : hasFiles
              ? "border-teal-300 bg-teal-50/40"
              : "border-slate-300 bg-slate-50/50 hover:border-teal-300 hover:bg-teal-50/30"
        }`}
      >
        <UploadIcon className="mb-4 h-12 w-12 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
          {isUploading ? "Uploading..." : "Drag and drop files here"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Files supported: PDF, Word, Excel, Images
        </p>

        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 rounded-full border border-teal-200 bg-teal-50 px-6 py-2 text-sm font-medium text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Choose File
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Maximum size: {formatDocumentSize(LEAD_DOCUMENT_MAX_SIZE_BYTES)}
        </p>
      </div>

      {!leadId && pendingDocuments.length > 0 && (
        <p className="text-xs text-slate-500">
          Documents will be uploaded when you save the lead.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasFiles && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                {document.file_url ? (
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-teal-700 hover:text-teal-800"
                  >
                    {document.original_filename}
                  </a>
                ) : (
                  <span className="font-medium text-slate-800">
                    {document.original_filename}
                  </span>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDocumentSize(document.file_size)}
                  {document.uploaded_by_name ? ` · ${document.uploaded_by_name}` : ""}
                </p>
              </div>
              {leadId && (
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={() => void handleRemoveDocument(document.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {pendingDocuments.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDocumentSize(file.size)} · Pending upload
                </p>
              </div>
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => handleRemovePending(index)}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
