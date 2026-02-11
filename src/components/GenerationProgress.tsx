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
              className="border-warning/20 bg-warning/10 text-warning rounded-lg border p-3 text-sm"
            >
              {w}
            </div>
          ))}
        </div>
      )}

      {status === "generating" && (
        <div className="border-accent/20 bg-accent/5 rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              {progress?.status || "Starting generation..."}
            </span>
            <button
              onClick={onCancel}
              className="text-ink-faint hover:text-error cursor-pointer text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
          {progress && (
            <div className="bg-edge h-2 w-full rounded-full">
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
        <div className="border-success/20 bg-success/10 text-success rounded-lg border p-3 text-sm">
          Generation complete!
        </div>
      )}

      {status === "error" && (
        <div className="border-error/20 bg-error/10 text-error rounded-lg border p-3 text-sm">
          {error || "Generation failed"}
        </div>
      )}
    </div>
  );
}
