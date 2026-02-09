"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface ImageSet {
  id: string;
  name: string;
  createdAt: number;
}

export function Sidebar() {
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  const activeId = pathname.startsWith("/image-set/") ? pathname.split("/")[2] : null;

  const fetchImageSets = useCallback(async () => {
    try {
      const res = await fetch("/api/image-sets");
      if (res.ok) {
        setImageSets(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImageSets();
  }, [fetchImageSets]);

  // Listen for name changes from ImageSetView
  useEffect(() => {
    function handleRename(e: Event) {
      const { id, name } = (e as CustomEvent).detail;
      setImageSets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    }
    window.addEventListener("imageset-renamed", handleRename);
    return () => window.removeEventListener("imageset-renamed", handleRename);
  }, []);

  async function createNew() {
    const res = await fetch("/api/image-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const created = await res.json();
      setImageSets((prev) => [created, ...prev]);
      router.push(`/image-set/${created.id}`);
    }
  }

  function startRename(e: React.MouseEvent, set: ImageSet) {
    e.stopPropagation();
    setRenamingId(set.id);
    setRenameValue(set.name);
  }

  async function saveRename(id: string) {
    setRenamingId(null);
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const existing = imageSets.find((s) => s.id === id);
    if (existing && trimmed === existing.name) return;

    const res = await fetch(`/api/image-sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setImageSets((prev) => prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s)));
    }
  }

  async function deleteImageSet(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this image set and all its images?")) return;

    const res = await fetch(`/api/image-sets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setImageSets((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) {
        router.push("/");
      }
    }
  }

  return (
    <aside className="bg-sidebar-bg border-sidebar-border flex h-full w-64 flex-col border-r shadow-[2px_0_12px_rgba(0,0,0,0.04)]">
      <div className="border-sidebar-border border-b p-4">
        <button
          onClick={createNew}
          className="bg-accent hover:bg-accent-hover shadow-accent/20 hover:shadow-accent/30 w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
        >
          + New Image Set
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-sidebar-border/50 h-12 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : imageSets.length === 0 ? (
          <div className="text-muted p-4 text-center text-sm">No image sets yet</div>
        ) : (
          <div className="p-2">
            {imageSets.map((set) => (
              <div
                key={set.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/image-set/${set.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/image-set/${set.id}`);
                  }
                }}
                aria-current={activeId === set.id ? "page" : undefined}
                className={`group flex cursor-pointer items-center justify-between rounded-lg p-3 text-sm transition-all duration-200 ${
                  activeId === set.id
                    ? "bg-accent/10 text-accent border-accent border-l-2"
                    : "hover:bg-sidebar-border/30 hover:border-sidebar-border border-l-2 border-transparent"
                }`}
              >
                <div className="min-w-0 flex-1 truncate">
                  {renamingId === set.id ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => saveRename(set.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(set.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="bg-background border-accent w-full rounded border px-1 py-0.5 text-sm font-medium focus:outline-none"
                    />
                  ) : (
                    <>
                      <div
                        className="truncate font-medium"
                        onDoubleClick={(e) => startRename(e, set)}
                      >
                        {set.name}
                      </div>
                      <div className="text-muted text-xs">
                        {new Date(set.createdAt).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-0.5">
                  <button
                    onClick={(e) => startRename(e, set)}
                    className="text-muted hover:text-accent cursor-pointer p-1 opacity-0 transition-all group-hover:opacity-100"
                    title="Rename"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteImageSet(e, set.id)}
                    className="text-muted hover:text-error cursor-pointer p-1 opacity-0 transition-all group-hover:opacity-100"
                    title="Delete"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-sidebar-border border-t p-3">
        <button
          onClick={() => router.push("/settings")}
          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-accent/10 text-accent"
              : "text-muted hover:text-foreground hover:bg-sidebar-border/30"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
