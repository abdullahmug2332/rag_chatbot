
"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  FileText,
  FileUp,
  File,
  Search,
  Eye,
  BookOpen,
  Trash2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Document = {
  id: string;
  filename: string;
  stored_filename: string | null;
  file_type: string;
  file_size: string | null;
  status: string;
  created_at: string;
};

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [search, setSearch] = useState("");

  async function fetchDocuments() {
    try {
      setLoading(true);

      const response = await fetch("/api/documents");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch documents");
      }

      setDocuments(data.documents);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch documents"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function handleUpload() {
    if (!selectedFiles.length || uploading) return;

    try {
      setUploading(true);

      let uploadedCount = 0;

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Failed to upload ${file.name}`);
        }

        uploadedCount++;
      }

      toast.success(`${uploadedCount} document(s) uploaded successfully`);

      setSelectedFiles([]);
      await fetchDocuments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
      await fetchDocuments();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, filename: string) {
    toast.warning(`Delete "${filename}"?`, {
      description: "This action cannot be undone.",
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const response = await fetch("/api/documents", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ id }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.message || "Failed to delete document");
            }

            setDocuments((previous) =>
              previous.filter((document) => document.id !== id)
            );

            toast.success("Document deleted successfully");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Delete failed"
            );
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.dismiss(),
      },
    });
  }

  function handleView(document: Document) {
    if (!document.stored_filename) {
      toast.error("This document has no uploaded file");
      return;
    }

    const fileUrl = `/uploads/${encodeURIComponent(
      document.stored_filename
    )}`;

    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  function handleRead(document: Document) {
    if (!document.stored_filename) {
      toast.error("This document has no uploaded file");
      return;
    }

    if (
      document.file_type === "text/plain" ||
      document.file_type === "application/pdf"
    ) {
      handleView(document);
      return;
    }

    toast.info(
      "Reading DOCX content will be available after implementing document extraction."
    );
  }

  function formatFileSize(size: string | null) {
    if (!size) return "N/A";

    const bytes = Number(size);

    if (!Number.isFinite(bytes)) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatFileType(type: string) {
    if (type === "application/pdf") return "PDF";
    if (type === "text/plain") return "TXT";
    if (
      type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return "DOCX";
    }

    return type.split("/").pop()?.toUpperCase() || "UNKNOWN";
  }

  const filteredDocuments = documents.filter((document) =>
    document.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0b0d11] text-white">

      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#0b0d11]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">

          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-[#1b202a]">
              <Bot className="size-6 text-white" />
            </div>

            <div>
              <h1 className="font-semibold tracking-tight">
                Learning Assistant
              </h1>
              <p className="text-xs text-gray-500">
                Document Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to Chat
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-8 md:py-10">

        {/* Page heading */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Document Management
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Upload, view, read and manage your documents.
          </p>
        </div>

        {/* Upload section */}
        <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#12161e] p-5 md:p-7">

          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-[#202631]">
              <FileUp className="size-5 text-gray-200" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Upload Documents
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                PDF, DOCX and TXT · Maximum 5 MB per file
              </p>
            </div>
          </div>

          {/* File input */}
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#0b0d11] px-5 py-7 text-center transition hover:border-white/30 hover:bg-[#11151d]">

            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-white/[0.06]">
              <Upload className="size-5 text-gray-300" />
            </div>

            <span className="text-sm font-medium text-gray-200">
              Click to select documents
            </span>

            <span className="mt-1 text-xs text-gray-500">
              Select multiple files if needed
            </span>

            <input
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={(event) =>
                setSelectedFiles(Array.from(event.target.files || []))
              }
              className="hidden"
            />
          </label>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">
                Selected files ({selectedFiles.length})
              </p>

              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0b0d11] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-5 shrink-0 text-gray-400" />
                    <span className="truncate text-sm text-gray-200">
                      {file.name}
                    </span>
                  </div>

                  <span className="shrink-0 text-xs text-gray-500">
                    {formatFileSize(String(file.size))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Upload className="size-4" />
            {uploading ? "Uploading..." : "Upload Documents"}
          </button>
        </section>

        {/* Documents table */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12161e]">

          {/* Table header */}
          <div className="flex flex-col gap-4 border-b border-white/[0.08] p-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h3 className="font-semibold text-white">
                Uploaded Documents
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {documents.length} document(s) available
              </p>
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />

              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0b0d11] pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-white/25 focus:ring-1 focus:ring-white/10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">

              <thead className="bg-white/[0.025]">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4 font-medium">Document</th>
                  <th className="px-5 py-4 font-medium">Type</th>
                  <th className="px-5 py-4 font-medium">Size</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Uploaded</th>
                  <th className="px-5 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">

                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      <RefreshCw className="mx-auto mb-3 size-5 animate-spin" />
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center"
                    >
                      <File className="mx-auto mb-3 size-8 text-gray-600" />
                      <p className="text-sm text-gray-400">
                        No documents found.
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Upload a document to get started.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((document) => (
                    <tr
                      key={document.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-[#202631]">
                            <FileText className="size-4 text-gray-300" />
                          </div>

                          <span className="max-w-[250px] truncate font-medium text-gray-200">
                            {document.filename}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-gray-400">
                        {formatFileType(document.file_type)}
                      </td>

                      <td className="px-5 py-4 text-gray-400">
                        {formatFileSize(document.file_size)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400">
                          {document.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-400">
                        {new Date(document.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() => handleView(document)}
                            title="View document"
                            className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:bg-white/10 hover:text-white"
                          >
                            <Eye className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRead(document)}
                            title="Read document"
                            className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:bg-white/10 hover:text-white"
                          >
                            <BookOpen className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(document.id, document.filename)
                            }
                            title="Delete document"
                            className="flex size-9 items-center justify-center rounded-lg border border-red-500/20 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="size-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
