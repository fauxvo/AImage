"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  sseProgressSchema,
  sseImageSavedSchema,
  sseWarningSchema,
  sseErrorSchema,
  type SSEProgress,
  type SSEImageSaved,
} from "@/lib/validations";

export type GenerationStatus = "idle" | "generating" | "complete" | "error";

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export function useGeneration(imageSetId: string) {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState<SSEProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<SSEImageSaved["image"][]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store handleSSEEvent in a ref so the generate callback always calls the latest version
  const handleSSEEventRef = useRef<(evt: SSEEvent) => void>(() => {});
  handleSSEEventRef.current = ({ event, data }: SSEEvent) => {
    try {
      switch (event) {
        case "started":
          setStatus("generating");
          break;
        case "progress": {
          const p = sseProgressSchema.parse(data);
          setProgress({ current: p.current, total: p.total, status: p.status });
          break;
        }
        case "image_saved": {
          const saved = sseImageSavedSchema.parse(data);
          setNewImages((prev) => [...prev, saved.image]);
          break;
        }
        case "complete":
          setStatus("complete");
          break;
        case "warning": {
          const w = sseWarningSchema.parse(data);
          setWarnings((prev) => [...prev, w.message]);
          break;
        }
        case "error": {
          const e = sseErrorSchema.parse(data);
          setStatus("error");
          setError(e.message);
          break;
        }
      }
    } catch {
      // Skip malformed SSE events that fail Zod validation
    }
  };

  // Auto-dismiss "complete" status after 5 seconds
  useEffect(() => {
    if (status === "complete") {
      completeTimerRef.current = setTimeout(() => setStatus("idle"), 5000);
    }
    return () => {
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
    };
  }, [status]);

  const generate = useCallback(async () => {
    // Abort any in-progress generation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("generating");
    setProgress(null);
    setError(null);
    setWarnings([]);
    setNewImages([]);

    try {
      const response = await fetch(`/api/image-sets/${imageSetId}/generate`, {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEventRef.current({ event: currentEvent, data });
            } catch {
              // skip malformed data
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [imageSetId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  return { status, progress, error, warnings, newImages, generate, cancel };
}
