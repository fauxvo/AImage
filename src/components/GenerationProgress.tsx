"use client";

import type { GenerationStatus } from "@/hooks/useGeneration";

interface GenerationProgressProps {
  status: GenerationStatus;
  progress: { current: number; total: number; status: string } | null;
  error: string | null;
  onCancel: () => void;
}

export function GenerationProgress({
  status,
  progress,
  error,
  onCancel,
}: GenerationProgressProps) {
  if (status === "idle") return null;

  return (
    <div className="mt-4">
      {status === "generating" && (
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {progress?.status || "Starting generation..."}
            </span>
            <button
              onClick={onCancel}
              className="text-xs text-muted hover:text-error transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          {progress && (
            <div className="w-full bg-sidebar-border rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {status === "complete" && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
          Generation complete!
        </div>
      )}

      {status === "error" && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
          {error || "Generation failed"}
        </div>
      )}
    </div>
  );
}
