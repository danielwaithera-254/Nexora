import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { vaultGet, vaultSet } from "../lib/vault";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  GripVertical,
  ImagePlus,
  Images,
  LayoutGrid,
  List,
  Maximize,
  MoreVertical,
  Pencil,
  Replace,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";

export const ATTACHMENT_CATEGORIES = [
  "HTF",
  "Setup",
  "Entry",
  "Management",
  "Exit",
  "Other",
] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];

export interface Attachment {
  id: string;
  name: string;
  category: AttachmentCategory;
  description: string;
  dataUrl: string;
  size: number;
  width?: number;
  height?: number;
  addedAt: number;
}

const MAX_SIZE = 10 * 1024 * 1024;

const CAT_STYLE: Record<AttachmentCategory, string> = {
  HTF: "bg-brand-soft text-brand ring-brand/20",
  Setup: "bg-sky-500/10 text-sky-600 ring-sky-500/25",
  Entry: "bg-gain-soft text-gain ring-gain/20",
  Management: "bg-warn-soft text-warn ring-warn/20",
  Exit: "bg-loss-soft text-loss ring-loss/20",
  Other: "bg-panel2 text-mut ring-edge",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fmtSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

const fmtWhen = (ts: number) =>
  new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const extOf = (dataUrl: string, fallback = "png") => {
  const m = dataUrl.match(/^data:image\/(\w+)/);
  return m ? (m[1] === "svg+xml" ? "svg" : m[1]) : fallback;
};

function loadAttachments(): Attachment[] {
  return vaultGet<Attachment[]>("attachments", []);
}

function readImage(file: File): Promise<{ dataUrl: string; width?: number; height?: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new Image();
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ dataUrl });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function Attachments() {
  const [attachments, setAttachments] = useState<Attachment[]>(loadAttachments);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"All" | AttachmentCategory>("All");
  const [query, setQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [storageWarn, setStorageWarn] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState<Attachment | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceIdRef = useRef<string | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const msgTimer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(msgTimer.current), []);

  const flash = (msg: string) => {
    window.clearTimeout(msgTimer.current);
    setUploadMsg(msg);
    msgTimer.current = window.setTimeout(() => setUploadMsg(null), 3200);
  };

  const persist = useCallback((next: Attachment[]) => {
    setAttachments(next);
    vaultSet("attachments", next);
    setStorageWarn(false);
  }, []);

  const ups = (id: string, p: number) =>
    setUploading((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x)));

  const handleFiles = async (files: File[] | FileList, replaceId?: string) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      flash("Only image files are accepted (PNG, JPG, JPEG, WEBP, GIF, SVG).");
      return;
    }
    const tooBig = list.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      flash(`"${tooBig.name}" is over the 10 MB limit.`);
      return;
    }
    const base = Date.now();

    if (replaceId) {
      const file = list[0];
      const id = `${base}-r`;
      setUploading((u) => [...u, { id, name: file.name, progress: 10 }]);
      const { dataUrl, width, height } = await readImage(file);
      for (let p = 25; p <= 100; p += 25) {
        ups(id, p);
        await sleep(70);
      }
      setUploading((u) => u.filter((x) => x.id !== id));
      persist(attachments.map((a) => (a.id === replaceId ? { ...a, dataUrl, width, height, size: file.size } : a)));
      return;
    }

    setUploading((u) => [
      ...u,
      ...list.map((f, i) => ({ id: `${base}-${i}`, name: f.name, progress: 6 })),
    ]);

    const results: Attachment[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const id = `${base}-${i}`;
      const { dataUrl, width, height } = await readImage(file);
      for (let p = 15; p <= 95; p += 20) {
        ups(id, p);
        await sleep(50);
      }
      const baseName = file.name.replace(/\.[^.]+$/, "") || file.name;
      results.push({
        id: `${base}-${i}-att`,
        name: baseName,
        category: "Entry",
        description: "",
        dataUrl,
        size: file.size,
        width,
        height,
        addedAt: Date.now(),
      });
      ups(id, 100);
      await sleep(60);
    }
    setUploading((u) => u.filter((x) => !x.id.startsWith(`${base}-`)));
    if (results.length) {
      setAttachments((prev) => {
        const next = [...prev, ...results];
        vaultSet("attachments", next);
        setStorageWarn(false);
        return next;
      });
      flash(`${results.length} attachment${results.length > 1 ? "s" : ""} uploaded.`);
    }
  };

  const handleReplace = (id: string) => {
    replaceIdRef.current = id;
    setMenuId(null);
    replaceRef.current?.click();
  };

  const removeAttachment = (id: string) => {
    setMenuId(null);
    setEditing(null);
    if (window.confirm("Delete this attachment?")) persist(attachments.filter((a) => a.id !== id));
  };

  const download = (a: Attachment) => {
    const el = document.createElement("a");
    el.href = a.dataUrl;
    el.download = `${a.name}.${extOf(a.dataUrl)}`;
    el.click();
  };

  const reorder = (fromId: string | null, toId: string | null) => {
    if (!fromId || !toId || fromId === toId) return;
    const next = [...attachments];
    const from = next.findIndex((a) => a.id === fromId);
    const to = next.findIndex((a) => a.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attachments.filter((a) => {
      if (filter !== "All" && a.category !== filter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [attachments, filter, query]);

  const countBy = useMemo(() => {
    const m = new Map<string, number>();
    attachments.forEach((a) => m.set(a.category, (m.get(a.category) || 0) + 1));
    return m;
  }, [attachments]);

  /* lightbox keyboard shortcuts */
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
        setZoom(1);
      } else if (e.key === "ArrowLeft") {
        setLightbox((i) => (i === null ? null : (i + visible.length - 1) % visible.length));
        setZoom(1);
      } else if (e.key === "ArrowRight") {
        setLightbox((i) => (i === null ? null : (i + 1) % visible.length));
        setZoom(1);
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, visible.length]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void lightboxRef.current?.requestFullscreen();
  };

  const shown = lightbox !== null ? visible[lightbox] : null;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-visible">
        <CardHead
          title="Trade Attachments"
          info="Attach screenshots to a trade for additional context and analysis — chart setups, entry/exit, annotations."
          icon={<Images size={14} />}
          right={
            <button
              onClick={() => fileRef.current?.click()}
              className="brand-gradient flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
            >
              <ImagePlus size={13} strokeWidth={2.5} />
              Add Attachment
            </button>
          }
        />

        <div className="space-y-3.5 px-5 pb-5 pt-1">
          {/* drop zone */}
          <div
            data-dropzone
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-5 py-6 text-center transition-all",
              dragActive
                ? "border-brand bg-brand/5"
                : "border-edge bg-panel2 hover:border-brand/50 hover:bg-panel"
            )}
          >
            <Upload size={20} className={cn("transition-colors", dragActive ? "text-brand" : "text-faint")} />
            <span className="text-[11.5px] font-bold text-mut">
              {dragActive ? "Drop to upload" : "Drop screenshots here or browse from your computer"}
            </span>
            <span className="text-[9px] text-faint">
              PNG · JPG · JPEG · WEBP · GIF · SVG — max 10 MB each
            </span>
          </div>

          {uploading.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-edge bg-panel2 px-3.5 py-2.5">
              {uploading.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <span className="w-40 truncate text-[10.5px] font-bold text-mut">{u.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
                    <div
                      className="brand-gradient h-full rounded-full transition-all duration-150"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <span className="tnum w-9 text-right text-[9.5px] font-bold text-faint">{u.progress}%</span>
                </div>
              ))}
            </div>
          )}

          {uploadMsg && (
            <div className="rounded-xl border border-brand/20 bg-brand-soft/60 px-3.5 py-2 text-[10.5px] font-bold text-brand">
              {uploadMsg}
            </div>
          )}

          {storageWarn && (
            <div className="rounded-xl border border-loss/20 bg-loss-soft/60 px-3.5 py-2 text-[10.5px] font-bold text-loss">
              Browser storage is full — attachments will not survive a reload. Download or delete older screenshots.
            </div>
          )}

          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search attachments…"
                className="w-full rounded-xl border border-edge bg-panel2 py-[7px] pl-8 pr-3 text-[11px] font-bold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
              />
            </div>

            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-edge bg-panel2 p-1">
              <button
                onClick={() => setFilter("All")}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition-all",
                  filter === "All" ? "brand-gradient text-white" : "text-mut hover:text-brand"
                )}
              >
                All
              </button>
              {ATTACHMENT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(filter === c ? "All" : c)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition-all",
                    filter === c ? "brand-gradient text-white" : "text-mut hover:text-brand"
                  )}
                >
                  {c}
                  {countBy.get(c) ? ` · ${countBy.get(c)}` : ""}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[10px] font-bold text-faint sm:block">
                {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
                {attachments.length > 0 && (
                  <>
                    {" · "}last added {fmtWhen(Math.max(...attachments.map((a) => a.addedAt)))}
                  </>
                )}
              </span>
              <div className="flex items-center rounded-xl border border-edge bg-panel2 p-1">
                <button
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  className={cn(
                    "rounded-lg p-1.5 transition-all",
                    view === "grid" ? "brand-gradient text-white" : "text-mut hover:text-brand"
                  )}
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  onClick={() => setView("list")}
                  aria-label="List view"
                  className={cn(
                    "rounded-lg p-1.5 transition-all",
                    view === "list" ? "brand-gradient text-white" : "text-mut hover:text-brand"
                  )}
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* empty state */}
          {visible.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge bg-panel2/60 px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Camera size={22} />
              </span>
              <p className="mt-1 text-[13px] font-extrabold text-ink">
                {attachments.length === 0 ? "No attachments yet" : "Nothing matches your search"}
              </p>
              <p className="max-w-[320px] text-[10.5px] leading-relaxed text-faint">
                {attachments.length === 0
                  ? "Capture your setup, entry and exit so you can visually review this trade later."
                  : "Try a different keyword or category filter."}
              </p>
              {attachments.length === 0 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="brand-gradient mt-1.5 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
                >
                  <ImagePlus size={13} strokeWidth={2.5} />
                  Add Screenshot
                </button>
              )}
            </div>
          )}

          {/* grid / list */}
          {visible.length > 0 && (
            <div
              className={cn(
                view === "grid"
                  ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
                  : "space-y-2"
              )}
            >
              {visible.map((a) => {
                const isOver = dragging && overId === a.id;
                return (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(a.id);
                      setDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (overId !== a.id) setOverId(a.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      reorder(dragId, a.id);
                      setDragId(null);
                      setOverId(null);
                      setDragging(false);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                      setDragging(false);
                    }}
                    className={cn(
                      "group relative rounded-xl border border-edge bg-panel2 transition-all",
                      isOver && "border-brand ring-2 ring-brand/25",
                      dragId === a.id && "opacity-40"
                    )}
                  >
                    {view === "grid" ? (
                      <>
                        <button
                          onClick={() => {
                            setZoom(1);
                            setLightbox(visible.findIndex((x) => x.id === a.id));
                          }}
                          className="block w-full overflow-hidden rounded-t-xl"
                          title="Click to preview"
                        >
                          <img
                            src={a.dataUrl}
                            alt={a.name}
                            loading="lazy"
                            className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        </button>
                        <div className="space-y-1 p-2.5">
                          <div className="flex items-center gap-1.5">
                            <GripVertical size={12} className="shrink-0 cursor-grab text-faint" />
                            <p className="min-w-0 flex-1 truncate text-[10.5px] font-bold text-ink" title={a.name}>
                              {a.name}
                            </p>
                            <span className="relative">
                              <button
                                onClick={() => setMenuId(menuId === a.id ? null : a.id)}
                                className="rounded-md p-1 text-faint transition-colors hover:bg-panel hover:text-ink"
                                aria-label="Attachment menu"
                              >
                                <MoreVertical size={13} />
                              </button>
                              {menuId === a.id && <CardMenu onEdit={() => setEditing(a)} onReplace={() => handleReplace(a.id)} onDownload={() => download(a)} onDelete={() => removeAttachment(a.id)} onClose={() => setMenuId(null)} />}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-[18px]">
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide ring-1", CAT_STYLE[a.category] ?? "bg-panel2 text-mut ring-edge")}>
                              {a.category}
                            </span>
                            <span className="ml-auto text-[8.5px] font-bold text-faint">{fmtWhen(a.addedAt)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 px-2.5 py-2">
                        <GripVertical size={13} className="shrink-0 cursor-grab text-faint" />
                        <button
                          onClick={() => {
                            setZoom(1);
                            setLightbox(visible.findIndex((x) => x.id === a.id));
                          }}
                          className="h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-edge"
                        >
                          <img src={a.dataUrl} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[11px] font-bold text-ink">{a.name}</p>
                            <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide ring-1", CAT_STYLE[a.category] ?? "bg-panel2 text-mut ring-edge")}>
                              {a.category}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[9.5px] text-faint">
                            {a.description || `${fmtSize(a.size)}${a.width ? ` · ${a.width} × ${a.height}` : ""} · ${fmtWhen(a.addedAt)}`}
                          </p>
                        </div>
                        <span className="relative">
                          <button
                            onClick={() => setMenuId(menuId === a.id ? null : a.id)}
                            className="rounded-md p-1.5 text-faint transition-colors hover:bg-panel hover:text-ink"
                            aria-label="Attachment menu"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuId === a.id && <CardMenu onEdit={() => setEditing(a)} onReplace={() => handleReplace(a.id)} onDownload={() => download(a)} onDelete={() => removeAttachment(a.id)} onClose={() => setMenuId(null)} />}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {visible.length > 0 && (
            <p className="text-[9px] text-faint">
              Drag screenshots to reorder them chronologically — Pre-Trade → Setup → Entry → Management → Exit.
            </p>
          )}
        </div>
      </Card>

      {/* hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const id = replaceIdRef.current;
          replaceIdRef.current = null;
          if (f && id) void handleFiles([f], id);
          e.target.value = "";
        }}
      />

      {/* lightbox */}
      {shown && lightbox !== null && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
          onClick={() => {
            setLightbox(null);
            setZoom(1);
          }}
        >
          <div className="flex items-center gap-2 px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-white">
              {shown.name}
              <span className="ml-2 font-normal text-white/45">
                {lightbox + 1} / {visible.length}
              </span>
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="tnum w-8 text-center text-[11px] font-bold text-white/70">{zoom}×</span>
            <button
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fullscreen"
            >
              <Maximize size={15} />
            </button>
            <button
              onClick={() => download(shown)}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Download"
            >
              <Download size={15} />
            </button>
            <button
              onClick={() => {
                setLightbox(null);
                setZoom(1);
              }}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 pb-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i === null ? null : (i + visible.length - 1) % visible.length));
                setZoom(1);
              }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-4"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <img
              src={shown.dataUrl}
              alt={shown.name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i === null ? null : (i + 1) % visible.length));
                setZoom(1);
              }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-4"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="px-4 pb-3 text-center text-[9.5px] text-white/40" onClick={(e) => e.stopPropagation()}>
            ← → navigate · Esc close · + / − zoom
          </div>
        </div>
      )}

      {/* edit modal */}
      {editing && (
        <EditModal
          att={editing}
          onCancel={() => setEditing(null)}
          onSave={(patch) => {
            persist(attachments.map((a) => (a.id === editing.id ? { ...a, ...patch } : a)));
            setEditing(null);
          }}
          onDelete={() => removeAttachment(editing.id)}
        />
      )}
    </div>
  );
}

function CardMenu({
  onEdit,
  onReplace,
  onDownload,
  onDelete,
  onClose,
}: {
  onEdit: () => void;
  onReplace: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const items = [
    { label: "Rename / details", icon: Pencil, fn: onEdit },
    { label: "Replace image", icon: Replace, fn: onReplace },
    { label: "Download", icon: Download, fn: onDownload },
    { label: "Delete", icon: Trash2, fn: onDelete, danger: true },
  ];
  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div className="absolute right-0 top-7 z-[75] w-44 overflow-hidden rounded-xl border border-edge bg-panel py-1 shadow-[var(--shadow-lg)]">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={() => {
              it.fn();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[11px] font-bold transition-colors",
              it.danger ? "text-loss hover:bg-loss-soft" : "text-mut hover:bg-brand-soft hover:text-brand"
            )}
          >
            <it.icon size={12.5} />
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

function EditModal({
  att,
  onCancel,
  onSave,
  onDelete,
}: {
  att: Attachment;
  onCancel: () => void;
  onSave: (patch: Partial<Attachment>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(att.name);
  const [category, setCategory] = useState<AttachmentCategory>(att.category);
  const [description, setDescription] = useState(att.description);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-edge px-5 py-3.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-soft text-brand">
            <Pencil size={12} />
          </span>
          <h3 className="font-display text-[13px] font-bold text-ink">Edit Attachment</h3>
          <button
            onClick={onCancel}
            className="ml-auto rounded-md p-1.5 text-faint transition-colors hover:bg-panel2 hover:text-ink"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={att.dataUrl} alt={att.name} className="h-14 w-20 rounded-lg border border-edge object-cover" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-mut">Details</p>
              <p className="text-[9.5px] text-faint">
                {fmtSize(att.size)}
                {att.width ? ` · ${att.width} × ${att.height}px` : ""} · added {fmtWhen(att.addedAt)}
              </p>
            </div>
          </div>

          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11.5px] font-bold text-ink outline-none transition-colors focus:border-brand"
            />
          </div>

          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Category</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ATTACHMENT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold ring-1 transition-all",
                    category === c
                      ? "brand-gradient text-white ring-transparent"
                      : cn("ring-edge text-mut hover:text-brand", CAT_STYLE[c])
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What was I seeing at this point? (e.g. sell-side liquidity sweep + displacement into FVG)"
              className="mt-1 w-full resize-none rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-medium leading-relaxed text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-edge px-5 py-3.5">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-xl border border-loss/25 bg-loss-soft px-3 py-2 text-[11px] font-bold text-loss transition-all hover:brightness-105"
          >
            <Trash2 size={12} />
            Delete
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onCancel}
              className="rounded-xl border border-edge bg-panel2 px-3.5 py-2 text-[11px] font-bold text-mut transition-all hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ name: name.trim() || att.name, category, description: description.trim() })}
              className="brand-gradient rounded-xl px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
