"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  FileCheck,
  Info,
} from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DatasetPreviewResponse } from "@/lib/types";

interface DatasetUploadZoneProps {
  projectId: string;
  onUploadSuccess: (data: DatasetPreviewResponse) => void;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export function DatasetUploadZone({
  projectId,
  onUploadSuccess,
}: DatasetUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Unsupported file format '${extension}'. Only CSV, XLSX, and XLS are supported.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size ${(file.size / (1024 * 1024)).toFixed(1)} MB exceeds the maximum 50 MB limit.`;
    }
    if (file.size === 0) {
      return "Uploaded file is empty (0 bytes).";
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgressText(`Uploading ${file.name} & computing SHA-256...`);

    try {
      const response = await apiClient.uploadDataset(projectId, file);
      onUploadSuccess(response);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(`[${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while uploading the dataset.");
      }
    } finally {
      setUploading(false);
      setUploadProgressText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDemoLoad = async (sampleName: "titanic" | "california_housing") => {
    setError(null);
    setUploading(true);
    const label = sampleName === "titanic" ? "Titanic Survival" : "California Housing";
    setUploadProgressText(`Loading ${label} benchmark dataset...`);
    try {
      const response = await apiClient.loadDemoDataset(projectId, sampleName);
      onUploadSuccess(response);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(`[${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load demo dataset.");
      }
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
          isDragging
            ? "border-brand-lavender bg-brand-glow/40 scale-[1.005]"
            : "border-hairline-strong bg-surface-1/70 hover:bg-surface-2 hover:border-hairline"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-brand-lavender/40 flex items-center justify-center text-brand-hover">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">Processing Dataset</p>
              <p className="text-xs font-mono text-ink-muted">
                {uploadProgressText}
              </p>
            </div>
            <div className="w-48 h-1 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full bg-brand-lavender animate-pulse w-3/4 rounded-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-hairline flex items-center justify-center text-brand-hover group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-md">
              <p className="text-sm font-semibold text-ink">
                Click to browse or drop your dataset here
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Supports tabular data files. Preprocessing is strictly validated
                to prevent test set leakage and preserve audit compliance.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-surface-3 border border-hairline text-ink-muted">
                <FileSpreadsheet className="w-3.5 h-3.5 text-telemetry-emerald" />
                .CSV (UTF-8, Latin-1)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-surface-3 border border-hairline text-ink-muted">
                <FileCheck className="w-3.5 h-3.5 text-telemetry-cyan" />
                .XLSX / .XLS
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-surface-3 border border-hairline text-ink-muted">
                Max 50 MB
              </span>
            </div>
          </>
        )}
      </div>

      {/* 1-Click Benchmark Demo Datasets Card */}
      <div className="p-4 rounded-xl border border-hairline bg-surface-1 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-xs font-semibold text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-telemetry-cyan" />
              1-Click Benchmark Datasets for Viva Evaluation
            </h4>
            <p className="text-[11px] text-ink-muted">
              Pre-bundled real datasets to test full AutoML capabilities without searching for files.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              handleDemoLoad("titanic");
            }}
            className="p-3.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 hover:border-telemetry-cyan/40 text-left transition-all disabled:opacity-50 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-ink group-hover:text-telemetry-cyan transition-colors">
                  Titanic Survival
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/30">
                  Classification
                </span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                800 rows with mixed numeric &amp; categorical types, missing ages, and binary target (Survived).
              </p>
            </div>
            <span className="text-[10px] font-mono text-telemetry-cyan mt-2 font-medium flex items-center gap-1">
              Load Titanic &rarr;
            </span>
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              handleDemoLoad("california_housing");
            }}
            className="p-3.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 hover:border-telemetry-emerald/40 text-left transition-all disabled:opacity-50 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-ink group-hover:text-telemetry-emerald transition-colors">
                  California Housing
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/30">
                  Regression
                </span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                1,000 rows with continuous numerical features and continuous target (MedHouseVal).
              </p>
            </div>
            <span className="text-[10px] font-mono text-telemetry-emerald mt-2 font-medium flex items-center gap-1">
              Load California Housing &rarr;
            </span>
          </button>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="p-4 rounded-xl border border-telemetry-rose/30 bg-telemetry-rose/10 flex items-start gap-3 text-left">
          <AlertCircle className="w-4 h-4 text-telemetry-rose mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-telemetry-rose">
              Dataset Upload Failed
            </h4>
            <p className="text-xs text-ink-muted font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Guidance Note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-hairline-subtle bg-surface-1/40 text-[11px] text-ink-muted">
        <Info className="w-3.5 h-3.5 text-brand-hover mt-0.5 shrink-0" />
        <p>
          Standard tabular files with headers in the first row. Binary or multiclass targets,
          continuous variables, and categorical string columns are supported.
        </p>
      </div>
    </div>
  );
}
