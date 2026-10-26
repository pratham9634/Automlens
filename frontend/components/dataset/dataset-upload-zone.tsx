"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  FileCheck,
  Info,
  ArrowRight,
} from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DatasetPreviewResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

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
    setUploadProgressText(`Uploading ${file.name} & computing SHA-256 fingerprint...`);

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
    <div className="space-y-5">
      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative rounded-card border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
          isDragging
            ? "border-accent bg-accent/5 scale-[1.005]"
            : "border-border hover:border-border-strong bg-surface hover:bg-surface-subtle"
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
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="w-12 h-12 rounded-button bg-surface-subtle border border-accent/40 flex items-center justify-center text-accent">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-primary">Processing Dataset</p>
              <p className="text-[11px] font-mono text-text-muted">{uploadProgressText}</p>
            </div>
            <div className="w-48 h-1 rounded-pill bg-surface-hover overflow-hidden">
              <div className="h-full bg-accent animate-pulse w-3/4 rounded-pill" />
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-button bg-surface-subtle border border-border flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-md">
              <p className="text-sm font-semibold text-text-primary">
                Click to browse or drop your dataset here
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                Supports CSV and Excel files up to 50 MB. Preprocessing transformations are fold-isolated inside cross-validation pipelines to guarantee zero test leakage.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Badge variant="neutral" className="gap-1.5 font-mono">
                <FileSpreadsheet className="w-3 h-3 text-success" />
                .CSV (UTF-8, Latin-1)
              </Badge>
              <Badge variant="neutral" className="gap-1.5 font-mono">
                <FileCheck className="w-3 h-3 text-info" />
                .XLSX / .XLS
              </Badge>
              <Badge variant="neutral" className="font-mono">
                Max 50 MB
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* 1-Click Benchmark Demo Datasets Card */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="card-title text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-info" />
              1-Click Benchmark Datasets for Viva Defense
            </h4>
            <p className="text-xs text-text-muted">
              Pre-bundled real datasets to test end-to-end AutoML workflows without manual file uploads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              handleDemoLoad("titanic");
            }}
            className="p-3.5 rounded-card border border-border bg-surface-subtle hover:bg-surface-hover/80 hover:border-accent/40 text-left transition-all disabled:opacity-50 group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                  Titanic Survival
                </span>
                <Badge variant="accent" size="sm">
                  Classification
                </Badge>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                800+ rows with mixed numeric and categorical features, missing ages, and binary target (Survived).
              </p>
            </div>
            <span className="text-[11px] font-mono text-accent mt-3 font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
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
            className="p-3.5 rounded-card border border-border bg-surface-subtle hover:bg-surface-hover/80 hover:border-success/40 text-left transition-all disabled:opacity-50 group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-text-primary group-hover:text-success transition-colors">
                  California Housing
                </span>
                <Badge variant="success" size="sm">
                  Regression
                </Badge>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                1,000 rows with continuous numerical features and continuous target (MedHouseVal).
              </p>
            </div>
            <span className="text-[11px] font-mono text-success mt-3 font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Load California Housing &rarr;
            </span>
          </button>
        </div>
      </Card>

      {/* Error Alert Display */}
      {error && (
        <AlertRow variant="danger" title="Dataset Upload Failed">
          {error}
        </AlertRow>
      )}

      {/* Academic Guidance Note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-card border border-border bg-surface-subtle text-xs text-text-secondary">
        <Info className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
        <p>
          Tabular files with headers in the first row. Target columns can be binary/multiclass categorical labels or continuous values. All transformations occur strictly inside cross-validation folds.
        </p>
      </div>
    </div>
  );
}
