"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isAxiosError } from "axios";

import {
  PRODUCT_BULK_UPLOAD_STATIC_EXAMPLE,
  uploadProductsCsv,
  type ImportedProductLineItem,
  type ProductBulkUploadResult,
} from "@/lib/productImportService";

const MAX_FILE_SIZE_BYTES = 1_048_576;
const CSV_ACCEPT =
  ".csv,text/csv,text/plain,application/csv,application/vnd.ms-excel";

interface ProductBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (lineItems: ImportedProductLineItem[]) => void;
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function ProductBulkUploadModal({
  isOpen,
  onClose,
  onUploaded,
}: ProductBulkUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductBulkUploadResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setIsDragging(false);
      setError(null);
      setResult(null);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  function validateAndSelectFile(file: File | null) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFile(null);
      setError("Please choose a file with a .csv extension.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setError("CSV file must be 1 MB or smaller.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    validateAndSelectFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    validateAndSelectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Choose a CSV file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const response = await uploadProductsCsv(selectedFile);
      setResult(response);
      if (response.processed_rows === 0) {
        setError(response.message);
        return;
      }
      onUploaded?.(response.line_items ?? []);
    } catch (err) {
      if (isAxiosError(err) && typeof err.response?.data?.detail === "string") {
        setError(err.response.data.detail);
      } else if (
        isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
      ) {
        setResult(err.response.data as ProductBulkUploadResult);
        setError(String((err.response.data as ProductBulkUploadResult).message));
      } else {
        setError("Unable to upload products. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-bulk-upload-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="product-bulk-upload-title" className="text-lg font-semibold text-slate-900">
              Bulk Upload Products
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Import product lines from CSV. Masters are created when missing; existing
              entries are reused.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-600">
          <p>
            Required: <code className="rounded bg-slate-100 px-1">category</code>,{" "}
            <code className="rounded bg-slate-100 px-1">product</code>. Optional:{" "}
            <code className="rounded bg-slate-100 px-1">brand</code>,{" "}
            <code className="rounded bg-slate-100 px-1">model</code>,{" "}
            <code className="rounded bg-slate-100 px-1">quantity</code> (defaults to 1),{" "}
            <code className="rounded bg-slate-100 px-1">uom</code> (defaults to Nos),{" "}
            <code className="rounded bg-slate-100 px-1">specification</code>,{" "}
            <code className="rounded bg-slate-100 px-1">remarks</code>.
          </p>
          <p>
            Category must be one of: <strong>IT</strong>, <strong>Non-IT</strong>,{" "}
            <strong>Solution</strong>.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">category</th>
                <th className="px-3 py-2">product</th>
                <th className="px-3 py-2">brand</th>
                <th className="px-3 py-2">model</th>
                <th className="px-3 py-2">quantity</th>
                <th className="px-3 py-2">uom</th>
                <th className="px-3 py-2">specification</th>
                <th className="px-3 py-2">remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">IT</td>
                <td className="px-3 py-2">Laptop</td>
                <td className="px-3 py-2">Dell</td>
                <td className="px-3 py-2">Latitude 5540</td>
                <td className="px-3 py-2">2</td>
                <td className="px-3 py-2">NOS</td>
                <td className="px-3 py-2">16GB RAM / 512GB SSD</td>
                <td className="px-3 py-2">Standard warranty</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">IT</td>
                <td className="px-3 py-2">Desktop</td>
                <td className="px-3 py-2">Dell</td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">5</td>
                <td className="px-3 py-2">UNIT</td>
                <td className="px-3 py-2">i7 / 16GB</td>
                <td className="px-3 py-2">Office rollout</td>
              </tr>
            </tbody>
          </table>
        </div>

        <a
          href={PRODUCT_BULK_UPLOAD_STATIC_EXAMPLE}
          download="product-bulk-upload-example.csv"
          className="mt-4 inline-flex rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Download example CSV
        </a>

        <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
          <input
            ref={fileInputRef}
            type="file"
            accept={CSV_ACCEPT}
            className="sr-only"
            onChange={handleFileInputChange}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragging
                ? "border-teal-500 bg-teal-50"
                : selectedFile
                  ? "border-teal-300 bg-teal-50/40"
                  : "border-slate-300 bg-slate-50/50 hover:border-teal-300 hover:bg-teal-50/30"
            }`}
          >
            <UploadIcon className="mb-4 h-12 w-12 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              {selectedFile ? "File ready to upload" : "Drag and drop file here"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Files supported: CSV</p>

            {selectedFile ? (
              <div className="mt-4 rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm text-slate-700">
                <span className="font-medium text-teal-800">{selectedFile.name}</span>
                <span className="ml-2 text-slate-500">
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 rounded-full border border-teal-200 bg-teal-50 px-6 py-2 text-sm font-medium text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100"
            >
              Choose File
            </button>

            <p className="mt-4 text-xs text-slate-400">Maximum size: 1 MB</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && result.processed_rows > 0 && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              <p className="font-medium">{result.message}</p>
              <p className="mt-2">
                Imported {result.processed_rows} row(s): {result.created.products} new
                product(s), {result.created.brands} new brand(s),{" "}
                {result.created.models} new model(s).
              </p>
            </div>
          )}

          {result && (result.errors?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Rows with issues</p>
              <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-5">
                {result.errors.map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isUploading || !selectedFile}
              onClick={() => void handleUpload()}
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload Products"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
