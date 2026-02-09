// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageGrid } from "./ImageGrid";

const onOpenFolder = vi.fn();

function makeImages(count: number, baseTime = 1000, setId = "set-1") {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${i}`,
    fileName: `${baseTime + i * 100}-${i}.png`,
    imageSetId: setId,
    createdAt: baseTime + i * 100,
  }));
}

beforeEach(() => {
  // ImageGrid uses window.location.origin
  Object.defineProperty(window, "location", {
    value: { origin: "http://localhost:3000" },
    writable: true,
  });
});

describe("ImageGrid", () => {
  it("shows empty state when no images", () => {
    render(<ImageGrid images={[]} imageSetId="set-1" onOpenFolder={onOpenFolder} />);
    expect(screen.getByText(/no images generated/i)).toBeInTheDocument();
  });

  it("renders images with correct count in header", () => {
    const images = makeImages(3);
    render(<ImageGrid images={images} imageSetId="set-1" onOpenFolder={onOpenFolder} />);
    // Header shows total count; batch header also shows count.
    // Use getAllByText since both "3 images" spans exist.
    const matches = screen.getAllByText(/^3 images?$/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows singular 'image' for count of 1", () => {
    const images = makeImages(1);
    render(<ImageGrid images={images} imageSetId="set-1" onOpenFolder={onOpenFolder} />);
    const matches = screen.getAllByText(/^1 image$/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("groups images into batches by time proximity", () => {
    // Two batches: 3 images close together, then 2 images 2 minutes later
    const batch1 = makeImages(3, 1000);
    const batch2 = makeImages(2, 200000); // >60s apart
    const images = [...batch1, ...batch2];

    render(<ImageGrid images={images} imageSetId="set-1" onOpenFolder={onOpenFolder} />);
    expect(screen.getByText(/2 generations/)).toBeInTheDocument();
  });

  it("shows Open Folder button", () => {
    render(<ImageGrid images={makeImages(1)} imageSetId="set-1" onOpenFolder={onOpenFolder} />);
    expect(screen.getByText("Open Folder")).toBeInTheDocument();
  });

  it("marks optimized images with a badge", () => {
    const images = [
      {
        id: "opt-1",
        fileName: "test_optimized.webp",
        imageSetId: "set-1",
        createdAt: 1000,
      },
    ];
    render(<ImageGrid images={images} imageSetId="set-1" onOpenFolder={onOpenFolder} />);
    expect(screen.getByText("Optimized")).toBeInTheDocument();
  });
});
