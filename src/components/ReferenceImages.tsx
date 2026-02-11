"use client";

import { useState, useRef, useCallback } from "react";
import {
  type ReferenceImage,
  REFERENCE_IMAGE_LIMITS,
  type ReferenceImageUploadResponse,
} from "@/lib/validations";

export function ReferenceImages({
  imageSetId,
  referenceImages,
  isDallE,
  onUpdate,
}: {
  imageSetId: string;
  referenceImages: ReferenceImage[];
  isDallE: boolean;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(referenceImages.length > 0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      // Client-side validation
      for (const file of fileArray) {
        if (!(REFERENCE_IMAGE_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
          setError(`"${file.name}" has unsupported type. Use PNG, JPEG, WebP, or GIF.`);
          return;
        }
        if (file.size > REFERENCE_IMAGE_LIMITS.MAX_FILE_SIZE) {
          setError(
            `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 4MB.`
          );
          return;
        }
      }

      setUploading(true);
      try {
        const formData = new FormData();
        for (const file of fileArray) {
          formData.append("files", file);
        }

        const res = await fetch(`/api/image-sets/${imageSetId}/reference-images`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Upload failed");
          return;
        }

        const data: ReferenceImageUploadResponse = await res.json();
        if (data.errors.length > 0) {
          setError(data.errors.map((e) => e.error).join("; "));
        }
        onUpdate();
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [imageSetId, onUpdate]
  );

  async function removeRef(refId: string) {
    try {
      const res = await fetch(`/api/image-sets/${imageSetId}/reference-images/${refId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to remove reference image");
        return;
      }
      onUpdate();
    } catch {
      setError("Failed to remove reference image");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      upload(e.dataTransfer.files);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  const totalSize = referenceImages.reduce((sum, r) => sum + r.fileSize, 0);

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-ink-faint transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <h2 className="text-ink-secondary text-xs font-semibold tracking-wider uppercase">
          Reference Images
        </h2>
        {!expanded && referenceImages.length > 0 && (
          <span className="text-ink-faint text-xs font-normal normal-case">
            ({referenceImages.length})
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3">
          {isDallE && referenceImages.length > 0 && (
            <div className="border-warning/20 bg-warning/5 text-warning mb-3 rounded-lg border p-3 text-sm">
              Reference images are not supported with DALL-E models and will be ignored during
              generation. DALL-E models are deprecated (sunset 05/12/2026) — consider switching to a
              GPT Image model for reference image support.
            </div>
          )}

          {/* Upload area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
              dragOver
                ? "border-accent bg-accent/5 text-accent"
                : "border-edge text-ink-faint hover:border-accent/50 hover:text-ink-secondary"
            } ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={REFERENCE_IMAGE_LIMITS.ALLOWED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
              }}
            />
            {uploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <svg
                  className="mx-auto mb-1 h-6 w-6 opacity-40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                  />
                </svg>
                <span>Drop images here or click to browse</span>
                <span className="mt-1 block text-xs opacity-60">
                  PNG, JPEG, WebP, GIF — max 4MB each
                </span>
              </>
            )}
          </div>

          {error && (
            <div className="border-error/20 bg-error/10 text-error mt-2 rounded-lg border p-2 text-xs">
              {error}
            </div>
          )}

          {/* Thumbnail strip */}
          {referenceImages.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {referenceImages.map((ref) => (
                  <div
                    key={ref.id}
                    className="group border-edge relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border"
                  >
                    <img
                      src={`/api/images/${imageSetId}/${ref.fileName}`}
                      alt={ref.originalName}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRef(ref.id);
                      }}
                      className="absolute top-0.5 right-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                      title={`Remove ${ref.originalName}`}
                    >
                      ×
                    </button>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {ref.originalName}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-ink-faint mt-2 text-xs">
                {referenceImages.length} file{referenceImages.length !== 1 ? "s" : ""} —{" "}
                {formatSize(totalSize)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
