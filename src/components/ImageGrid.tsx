"use client";

import { useState } from "react";

interface ImageItem {
  id: string;
  fileName: string;
  imageSetId: string;
  createdAt: number;
}

interface ImageGridProps {
  images: ImageItem[];
  imageSetId: string;
  onOpenFolder: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Group images by generation batch (images created within 60s of each other) */
function groupByBatch(images: ImageItem[]) {
  if (images.length === 0) return [];

  const batches: { timestamp: number; images: ImageItem[] }[] = [];
  let currentBatch: ImageItem[] = [images[0]];
  let batchTime = images[0].createdAt;

  for (let i = 1; i < images.length; i++) {
    // Images are sorted newest-first; within a batch timestamps are close
    if (Math.abs(images[i].createdAt - batchTime) < 60_000) {
      currentBatch.push(images[i]);
    } else {
      batches.push({ timestamp: batchTime, images: currentBatch });
      currentBatch = [images[i]];
      batchTime = images[i].createdAt;
    }
  }
  batches.push({ timestamp: batchTime, images: currentBatch });
  return batches;
}

function getFullUrl(path: string) {
  return `${window.location.origin}${path}`;
}

export function ImageGrid({ images, imageSetId, onOpenFolder }: ImageGridProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyUrl(e: React.MouseEvent, url: string, id: string) {
    e.stopPropagation();
    await navigator.clipboard.writeText(getFullUrl(url));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        No images generated yet. Write a prompt and click Generate.
      </div>
    );
  }

  const batches = groupByBatch(images);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {images.length} image{images.length !== 1 ? "s" : ""} across{" "}
          {batches.length} generation{batches.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onOpenFolder}
          className="px-3 py-1.5 border border-sidebar-border rounded-md text-xs hover:bg-sidebar-border/30 transition-colors cursor-pointer"
        >
          Open Folder
        </button>
      </div>

      <div className="space-y-4">
        {batches.map((batch, batchIdx) => (
          <div key={batch.timestamp}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted">
                {formatDate(batch.timestamp)}
              </span>
              {batchIdx === 0 && batches.length > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                  Latest
                </span>
              )}
              <span className="text-xs text-muted">
                ({batch.images.length} image{batch.images.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {batch.images.map((img) => {
                const url = `/api/images/${imageSetId}/${img.fileName}`;
                return (
                  <div
                    key={img.id}
                    onClick={() => setLightboxUrl(url)}
                    className="group/img relative aspect-square rounded-lg overflow-hidden bg-sidebar-border/30 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all"
                  >
                    <img
                      src={url}
                      alt="Generated"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <button
                      onClick={(e) => copyUrl(e, url, img.id)}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 px-2 py-1 bg-black/70 text-white rounded text-[10px] font-medium hover:bg-black/90 transition-all cursor-pointer"
                      title="Copy image URL"
                    >
                      {copiedId === img.id ? "Copied!" : "Copy URL"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={lightboxUrl}
              alt="Generated (full size)"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => copyUrl(e, lightboxUrl, "lightbox")}
                className="px-3 py-1.5 bg-black/70 text-white rounded-md text-xs font-medium hover:bg-black/90 transition-colors cursor-pointer backdrop-blur-sm"
              >
                {copiedId === "lightbox" ? "Copied!" : "Copy URL"}
              </button>
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-black/70 text-white rounded-md text-xs font-medium hover:bg-black/90 transition-colors cursor-pointer backdrop-blur-sm"
              >
                Open in Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
