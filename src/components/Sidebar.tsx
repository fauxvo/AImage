"use client";

import { useEffect, useState } from "react";
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

  const activeId = pathname.startsWith("/image-set/")
    ? pathname.split("/")[2]
    : null;

  useEffect(() => {
    fetchImageSets();
  }, []);

  async function fetchImageSets() {
    try {
      const res = await fetch("/api/image-sets");
      if (res.ok) {
        setImageSets(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

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
      setImageSets((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s))
      );
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
    <aside className="w-64 h-full bg-sidebar-bg border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <button
          onClick={createNew}
          className="w-full py-2 px-4 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium cursor-pointer"
        >
          + New Image Set
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-sidebar-border/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : imageSets.length === 0 ? (
          <div className="p-4 text-sm text-muted text-center">
            No image sets yet
          </div>
        ) : (
          <div className="p-2">
            {imageSets.map((set) => (
              <div
                key={set.id}
                onClick={() => router.push(`/image-set/${set.id}`)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeId === set.id
                    ? "bg-accent/10 text-accent"
                    : "hover:bg-sidebar-border/30"
                }`}
              >
                <div className="truncate flex-1 min-w-0">
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
                      className="w-full px-1 py-0.5 bg-background border border-accent rounded text-sm font-medium focus:outline-none"
                    />
                  ) : (
                    <>
                      <div
                        className="truncate font-medium"
                        onDoubleClick={(e) => startRename(e, set)}
                      >
                        {set.name}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(set.createdAt).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                  <button
                    onClick={(e) => startRename(e, set)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent transition-all cursor-pointer"
                    title="Rename"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteImageSet(e, set.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-error transition-all cursor-pointer"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-sidebar-border text-xs text-muted text-center">
        AImage
      </div>
    </aside>
  );
}
