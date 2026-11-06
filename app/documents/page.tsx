"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PiRobotThin } from "react-icons/pi";
type Document = {
  id: string;
  filename: string;
  stored_filename: string | null;
  file_type: string;
  file_size: string | null;
  status: string;
  created_at: string;
};

type QueuedFile = {
  id: string;
  file: File;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C468]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1420]";

/* ---------- Helpers ---------- */

function formatFileSize(size: string | number | null) {
  if (size === null || size === undefined) return "N/A";
  const bytes = Number(size);
  if (!Number.isFinite(bytes)) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fileKind(typeOrName: string) {
  const value = typeOrName.toLowerCase();

  if (value === "application/pdf" || value.endsWith(".pdf")) {
    return {
      label: "PDF",
      tint: "border-[#F07167]/20 bg-[#F07167]/10 text-[#F4A09A]",
    };
  }
  if (value.includes("wordprocessingml") || value.endsWith(".docx")) {
    return {
      label: "DOCX",
      tint: "border-[#6C9EFF]/20 bg-[#6C9EFF]/10 text-[#A8C4FF]",
    };
  }
  if (value === "text/plain" || value.endsWith(".txt")) {
    return {
      label: "TXT",
      tint: "border-white/10 bg-white/[0.05] text-[#B7BECC]",
    };
  }
  return {
    label: value.split("/").pop()?.toUpperCase() || "FILE",
    tint: "border-white/10 bg-white/[0.05] text-[#B7BECC]",
  };
}

function statusStyle(status: string) {
  const value = status.toLowerCase();
  const label = value.charAt(0).toUpperCase() + value.slice(1);

  if (["ready", "processed", "completed", "indexed", "done"].includes(value)) {
    return {
      label,
      dot: "bg-[#7FD1A0]",
      cls: "border-[#7FD1A0]/20 bg-[#7FD1A0]/10 text-[#A6E3BE]",
    };
  }
  if (["failed", "error"].includes(value)) {
    return {
      label,
      dot: "bg-[#F07167]",
      cls: "border-[#F07167]/20 bg-[#F07167]/10 text-[#F4A09A]",
    };
  }
  if (
    ["processing", "pending", "uploaded", "queued", "embedding"].includes(value)
  ) {
    return {
      label,
      dot: "bg-[#E8C468] animate-pulse",
      cls: "border-[#E8C468]/20 bg-[#E8C468]/10 text-[#F0D58C]",
    };
  }
  return {
    label,
    dot: "bg-[#8B94A7]",
    cls: "border-white/10 bg-white/[0.05] text-[#B7BECC]",
  };
}

/* ---------- Page ---------- */

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        const response = await fetch("/api/documents", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Couldn't load your documents.");
        }

        setDocuments(data.documents ?? []);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Couldn't load your documents.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchDocuments("initial");
  }, [fetchDocuments]);

  /* ---------- Upload queue ---------- */

  function addFiles(files: FileList | File[]) {
    const accepted: QueuedFile[] = [];

    for (const file of Array.from(files)) {
      const extension = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        toast.error(`${file.name} isn't a PDF, DOCX or TXT file.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }

      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        status: "ready",
      });
    }

    if (!accepted.length) return;

    setQueue((prev) => {
      const existing = new Set(prev.map((item) => item.id));
      return [...prev, ...accepted.filter((item) => !existing.has(item.id))];
    });
  }

  function updateQueueItem(id: string, patch: Partial<QueuedFile>) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleUpload() {
    const pending = queue.filter(
      (item) => item.status === "ready" || item.status === "error",
    );
    if (!pending.length || uploading) return;

    setUploading(true);
    let uploaded = 0;

    for (const item of pending) {
      updateQueueItem(item.id, { status: "uploading", error: undefined });

      try {
        const formData = new FormData();
        formData.append("file", item.file);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Upload failed.");
        }

        updateQueueItem(item.id, { status: "done" });
        uploaded++;
      } catch (error) {
        updateQueueItem(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }

    setUploading(false);

    if (uploaded > 0) {
      toast.success(
        uploaded === 1 ? "Uploaded 1 file" : `Uploaded ${uploaded} files`,
      );
      setTimeout(() => {
        setQueue((prev) => prev.filter((item) => item.status !== "done"));
      }, 1200);
    }

    const failed = pending.length - uploaded;
    if (failed > 0) {
      toast.error(
        `${failed} file${failed === 1 ? "" : "s"} didn't upload. Check the list and try again.`,
      );
    }

    await fetchDocuments();
  }

  /* ---------- Document actions ---------- */

  function handleDelete(document: Document) {
    toast(`Delete ${document.filename}?`, {
      description:
        "The assistant will stop using this file. This can't be undone.",
      duration: 10000,
      action: {
        label: "Delete",
        onClick: () => void deleteDocument(document.id),
      },
      cancel: {
        label: "Keep",
        onClick: () => {},
      },
    });
  }

  async function deleteDocument(id: string) {
    setDeletingId(id);

    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Couldn't delete the document.");
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success("Document deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete the document.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleView(document: Document) {
    if (!document.stored_filename) {
      toast.error("This document has no file attached.");
      return;
    }

    const fileUrl = `/uploads/${encodeURIComponent(document.stored_filename)}`;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  function handleRead(document: Document) {
    if (!document.stored_filename) {
      toast.error("This document has no file attached.");
      return;
    }

    if (
      document.file_type === "text/plain" ||
      document.file_type === "application/pdf"
    ) {
      handleView(document);
      return;
    }

    toast.info("Reading DOCX files in the browser isn't available yet.");
  }

  /* ---------- Derived ---------- */

  const query = search.trim().toLowerCase();
  const visibleDocuments = documents
    .filter((doc) => doc.filename.toLowerCase().includes(query))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const pendingCount = queue.filter(
    (item) => item.status === "ready" || item.status === "error",
  ).length;

  return (
    <main className="min-h-dvh bg-[#0E1420] text-[#E7EAF0] selection:bg-[#E8C468]/30">
      <style>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
        .row-in { animation: rowIn 0.24s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .row-in { animation: none; }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0E1420]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#E8C468] text-[#1A1405]">
              <PiRobotThin className="size-[25px]" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <h1 className="text-[15px] font-semibold tracking-tight">
                Learning Assistant
              </h1>
              <p className="text-xs text-[#8B94A7]">Documents</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className={`flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-sm transition-colors hover:border-white/[0.16] hover:bg-white/[0.04] ${focusRing}`}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back to chat</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Heading */}
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Your documents
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-[#8B94A7]">
            The assistant searches these files when you ask a question. Add
            notes, papers or handouts to get answers grounded in them.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Upload panel */}
          <section className="rounded-2xl border border-white/[0.07] bg-[#141B2A] p-5 lg:sticky lg:top-24">
            <h3 className="text-[15px] font-semibold">Add documents</h3>
            <p className="mt-1 text-[13px] text-[#8B94A7]">
              PDF, DOCX or TXT, up to 5 MB each.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                if (!dragging) setDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files?.length) {
                  addFiles(event.dataTransfer.files);
                }
              }}
              className={`mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-all duration-200 ${focusRing} ${
                dragging
                  ? "scale-[1.01] border-[#E8C468]/70 bg-[#E8C468]/[0.06]"
                  : "border-white/[0.14] bg-[#0E1420] hover:border-white/[0.28] hover:bg-[#111827]"
              }`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-full transition-colors ${
                  dragging
                    ? "bg-[#E8C468] text-[#1A1405]"
                    : "bg-white/[0.06] text-[#B7BECC]"
                }`}
              >
                <Upload className="size-[18px]" />
              </span>
              <span className="mt-3 text-sm font-medium">
                {dragging ? "Drop to add" : "Drop files here or browse"}
              </span>
              <span className="mt-1 text-xs text-[#5D667A]">
                You can add several at once
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) addFiles(event.target.files);
                event.target.value = "";
              }}
            />

            {/* Queue */}
            {queue.length > 0 && (
              <ul className="mt-4 space-y-2">
                {queue.map((item) => {
                  const kind = fileKind(item.file.name);
                  return (
                    <li
                      key={item.id}
                      className={`row-in flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        item.status === "error"
                          ? "border-[#F07167]/25 bg-[#F07167]/[0.05]"
                          : item.status === "done"
                            ? "border-[#7FD1A0]/25 bg-[#7FD1A0]/[0.05]"
                            : "border-white/[0.06] bg-[#0E1420]"
                      }`}
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold ${kind.tint}`}
                      >
                        {kind.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </p>
                        <p
                          className={`truncate text-xs ${
                            item.status === "error"
                              ? "text-[#F4A09A]"
                              : "text-[#5D667A]"
                          }`}
                        >
                          {item.status === "error"
                            ? item.error
                            : item.status === "uploading"
                              ? "Uploading…"
                              : item.status === "done"
                                ? "Uploaded"
                                : formatFileSize(item.file.size)}
                        </p>
                      </div>

                      {item.status === "uploading" ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-[#E8C468]" />
                      ) : item.status === "done" ? (
                        <Check className="size-4 shrink-0 text-[#7FD1A0]" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeFromQueue(item.id)}
                          disabled={uploading}
                          aria-label={`Remove ${item.file.name}`}
                          className={`flex size-7 shrink-0 items-center justify-center rounded-md text-[#8B94A7] transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40 ${focusRing}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || pendingCount === 0}
              className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#E8C468] text-sm font-semibold text-[#1A1405] transition-all duration-150 hover:bg-[#F0D07A] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-[#5D667A] ${focusRing}`}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : pendingCount > 0 ? (
                `Upload ${pendingCount} file${pendingCount === 1 ? "" : "s"}`
              ) : (
                "Upload"
              )}
            </button>
          </section>

          {/* Library */}
          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141B2A]">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="text-[15px] font-semibold">Library</h3>
                <p className="mt-0.5 text-[13px] text-[#8B94A7]">
                  {loading
                    ? "Loading…"
                    : `${documents.length} file${documents.length === 1 ? "" : "s"}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64 sm:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5D667A]" />
                  <input
                    type="text"
                    placeholder="Search by name"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Search documents"
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0E1420] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[#5D667A] focus:border-[#E8C468]/45"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void fetchDocuments()}
                  disabled={refreshing || loading}
                  aria-label="Refresh list"
                  title="Refresh list"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-[#8B94A7] transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50 ${focusRing}`}
                >
                  <RefreshCw
                    className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Column labels (desktop) */}
            <div className="hidden grid-cols-[minmax(0,1fr)_64px_80px_112px_112px_116px] gap-4 border-b border-white/[0.06] px-5 py-2.5 text-xs font-medium text-[#5D667A] md:grid">
              <span>Name</span>
              <span>Type</span>
              <span>Size</span>
              <span>Status</span>
              <span>Added</span>
              <span className="text-right">Actions</span>
            </div>

            {loading ? (
              <ul className="divide-y divide-white/[0.05]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-4">
                    <div className="size-9 animate-pulse rounded-lg bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : visibleDocuments.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.05]">
                  <FileText className="size-5 text-[#8B94A7]" />
                </div>

                {documents.length === 0 ? (
                  <>
                    <p className="mt-4 text-sm font-medium">No documents yet</p>
                    <p className="mt-1 max-w-xs text-[13px] leading-6 text-[#8B94A7]">
                      Add a PDF, Word or text file to start asking questions
                      about it.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`mt-5 flex h-9 items-center gap-2 rounded-lg border border-white/[0.1] px-3.5 text-sm transition-colors hover:bg-white/[0.05] ${focusRing}`}
                    >
                      <Upload className="size-4" />
                      Choose files
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-sm font-medium">
                      No files match &ldquo;{search.trim()}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className={`mt-3 rounded-md px-2 py-1 text-[13px] text-[#E8C468] transition-colors hover:bg-[#E8C468]/10 ${focusRing}`}
                    >
                      Clear search
                    </button>
                  </>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {visibleDocuments.map((document) => {
                  const kind = fileKind(document.file_type);
                  const status = statusStyle(document.status);
                  const isDeleting = deletingId === document.id;

                  return (
                    <li
                      key={document.id}
                      className={`row-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.02] sm:px-5 md:grid-cols-[minmax(0,1fr)_64px_80px_112px_112px_116px] md:gap-4 ${
                        isDeleting ? "pointer-events-none opacity-40" : ""
                      }`}
                    >
                      {/* Name */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${kind.tint}`}
                        >
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium"
                            title={document.filename}
                          >
                            {document.filename}
                          </p>
                          {/* Meta (mobile) */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8B94A7] md:hidden">
                            <span>{kind.label}</span>
                            <span>{formatFileSize(document.file_size)}</span>
                            <span>{formatDate(document.created_at)}</span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${status.cls}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${status.dot}`}
                              />
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop columns */}
                      <span className="hidden text-xs font-medium text-[#B7BECC] md:block">
                        {kind.label}
                      </span>
                      <span className="hidden text-sm text-[#8B94A7] md:block">
                        {formatFileSize(document.file_size)}
                      </span>
                      <span className="hidden md:block">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.cls}`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${status.dot}`}
                          />
                          {status.label}
                        </span>
                      </span>
                      <span className="hidden text-sm text-[#8B94A7] md:block">
                        {formatDate(document.created_at)}
                      </span>

                      {/* Actions */}
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(document)}
                          title="Open file"
                          aria-label={`Open ${document.filename}`}
                          className={`flex size-8 items-center justify-center rounded-md text-[#8B94A7] transition-colors hover:bg-white/[0.07] hover:text-white ${focusRing}`}
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRead(document)}
                          title="Read in browser"
                          aria-label={`Read ${document.filename}`}
                          className={`flex size-8 items-center justify-center rounded-md text-[#8B94A7] transition-colors hover:bg-white/[0.07] hover:text-white ${focusRing}`}
                        >
                          <BookOpen className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(document)}
                          title="Delete"
                          aria-label={`Delete ${document.filename}`}
                          className={`flex size-8 items-center justify-center rounded-md text-[#8B94A7] transition-colors hover:bg-[#F07167]/10 hover:text-[#F4A09A] ${focusRing}`}
                        >
                          {isDeleting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}