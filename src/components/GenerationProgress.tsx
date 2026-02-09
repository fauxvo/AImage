"use client";

import type { GenerationStatus } from "@/hooks/useGeneration";
import type { SSEProgress } from "@/lib/validations";

interface GenerationProgressProps {
  status: GenerationStatus;
  progress: SSEProgress | null;
  error: string | null;
  warnings?: string[];
  onCancel: () => void;
}

export function GenerationProgress({
  status,
  progress,
  error,
  warnings,
  onCancel,
}: GenerationProgressProps) {
  if (status === "idle" && (!warnings || warnings.length === 0)) return null;

  return (
    <div className="mt-4">
      {warnings && warnings.length > 0 && (
        <div className="mb-2 space-y-1">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
            >
              {w}
            </div>
          ))}
        </div>
      )}

      {status === "generating" && (
        <div className="bg-accent/5 border-accent/20 rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              {progress?.status || "Starting generation..."}
            </span>
            <button
              onClick={onCancel}
              className="text-muted hover:text-error cursor-pointer text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
          {progress && (
            <div className="bg-sidebar-border h-2 w-full rounded-full">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {status === "complete" && (
        <div className="bg-success/10 border-success/20 text-success rounded-lg border p-3 text-sm">
          Generation complete!
        </div>
      )}

      {status === "error" && (
        <div className="bg-error/10 border-error/20 text-error rounded-lg border p-3 text-sm">
          {error || "Generation failed"}
        </div>
      )}
    </div>
  );
}
