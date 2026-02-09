// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeneration } from "./useGeneration";

function sseText(events: Array<{ event: string; data: unknown }>): string {
  return events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join("");
}

function mockFetch(body: string, ok = true, status = 200) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    body: stream,
    headers: new Headers(),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("useGeneration", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useGeneration("set-1"));
    expect(result.current.status).toBe("idle");
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.warnings).toEqual([]);
    expect(result.current.newImages).toEqual([]);
  });

  it("transitions through generating → complete on success", async () => {
    const body = sseText([
      { event: "started", data: { imageSetId: "set-1", numImages: 1 } },
      {
        event: "progress",
        data: { current: 1, total: 1, status: "Generating..." },
      },
      {
        event: "image_saved",
        data: { current: 1, total: 1, image: { id: "i1", fileName: "f.png" } },
      },
      {
        event: "complete",
        data: { images: [{ id: "i1", fileName: "f.png", filePath: "/p" }] },
      },
    ]);
    vi.stubGlobal("fetch", mockFetch(body));

    const { result } = renderHook(() => useGeneration("set-1"));

    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("complete");
    });
    expect(result.current.newImages).toHaveLength(1);
    expect(result.current.newImages[0].id).toBe("i1");
  });

  it("sets error state on SSE error event", async () => {
    const body = sseText([
      { event: "started", data: { imageSetId: "set-1", numImages: 1 } },
      { event: "error", data: { message: "Something went wrong" } },
    ]);
    vi.stubGlobal("fetch", mockFetch(body));

    const { result } = renderHook(() => useGeneration("set-1"));
    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error).toBe("Something went wrong");
  });

  it("sets error state on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        body: null,
      })
    );

    const { result } = renderHook(() => useGeneration("set-1"));
    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error).toContain("Internal Server Error");
  });

  it("collects warnings from SSE", async () => {
    const body = sseText([
      { event: "started", data: { imageSetId: "set-1", numImages: 1 } },
      { event: "warning", data: { message: "Ref images not supported" } },
      {
        event: "progress",
        data: { current: 1, total: 1, status: "Generating..." },
      },
      {
        event: "image_saved",
        data: { current: 1, total: 1, image: { id: "i1", fileName: "f.png" } },
      },
      {
        event: "complete",
        data: { images: [{ id: "i1", fileName: "f.png", filePath: "/p" }] },
      },
    ]);
    vi.stubGlobal("fetch", mockFetch(body));

    const { result } = renderHook(() => useGeneration("set-1"));
    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("complete");
    });
    expect(result.current.warnings).toContain("Ref images not supported");
  });

  it("updates progress during generation", async () => {
    const body = sseText([
      { event: "started", data: { imageSetId: "set-1", numImages: 2 } },
      {
        event: "progress",
        data: { current: 1, total: 2, status: "Generating image 1 of 2..." },
      },
      {
        event: "image_saved",
        data: { current: 1, total: 2, image: { id: "i1", fileName: "a.png" } },
      },
      {
        event: "progress",
        data: { current: 2, total: 2, status: "Generating image 2 of 2..." },
      },
      {
        event: "image_saved",
        data: { current: 2, total: 2, image: { id: "i2", fileName: "b.png" } },
      },
      {
        event: "complete",
        data: { images: [] },
      },
    ]);
    vi.stubGlobal("fetch", mockFetch(body));

    const { result } = renderHook(() => useGeneration("set-1"));
    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("complete");
    });
    expect(result.current.newImages).toHaveLength(2);
  });

  it("cancel sets status to idle", async () => {
    const { result } = renderHook(() => useGeneration("set-1"));
    act(() => {
      result.current.cancel();
    });
    expect(result.current.status).toBe("idle");
  });

  it("aborts first generation when generate() is called again", async () => {
    // First call: a slow stream that never resolves until aborted
    let firstAborted = false;
    const slowFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal) {
        init.signal.addEventListener("abort", () => {
          firstAborted = true;
        });
      }
      // Return a stream that hangs (never closes)
      return Promise.resolve({
        ok: true,
        statusText: "OK",
        body: new ReadableStream({
          start() {
            // intentionally never enqueue or close — simulates slow response
          },
          cancel() {
            // stream cancelled on abort
          },
        }),
        headers: new Headers(),
      });
    });

    vi.stubGlobal("fetch", slowFetch);

    const { result } = renderHook(() => useGeneration("set-1"));

    // Start first generation (don't await — it hangs)
    act(() => {
      result.current.generate();
    });

    // The second call should abort the first
    const secondBody = sseText([
      { event: "started", data: { imageSetId: "set-1", numImages: 1 } },
      {
        event: "image_saved",
        data: { current: 1, total: 1, image: { id: "i2", fileName: "second.png" } },
      },
      {
        event: "complete",
        data: { images: [{ id: "i2", fileName: "second.png", filePath: "/p" }] },
      },
    ]);
    vi.stubGlobal("fetch", mockFetch(secondBody));

    await act(async () => {
      await result.current.generate();
    });

    expect(firstAborted).toBe(true);
    await waitFor(() => {
      expect(result.current.status).toBe("complete");
    });
    // Only second generation's images should appear
    expect(result.current.newImages).toHaveLength(1);
    expect(result.current.newImages[0].id).toBe("i2");
  });
});
