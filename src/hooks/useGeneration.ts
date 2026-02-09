"use client";

import { useState, useRef, useCallback } from "react";

export type GenerationStatus = "idle" | "generating" | "complete" | "error";

interface GenerationProgress {
  current: number;
  total: number;
  status: string;
}

interface GeneratedImage {
  id: string;
  fileName: string;
}

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export function useGeneration(imageSetId: string) {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newImages, setNewImages] = useState<GeneratedImage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    // Abort any in-progress generation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("generating");
    setProgress(null);
    setError(null);
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
              handleSSEEvent({ event: currentEvent, data });
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

  function handleSSEEvent({ event, data }: SSEEvent) {
    switch (event) {
      case "started":
        setStatus("generating");
        break;
      case "progress":
        setProgress({
          current: data.current as number,
          total: data.total as number,
          status: data.status as string,
        });
        break;
      case "image_saved":
        setNewImages((prev) => [
          ...prev,
          data.image as GeneratedImage,
        ]);
        break;
      case "complete":
        setStatus("complete");
        break;
      case "error":
        setStatus("error");
        setError(data.message as string);
        break;
    }
  }

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  return { status, progress, error, newImages, generate, cancel };
}
