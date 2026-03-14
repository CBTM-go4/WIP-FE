"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listBankStatements,
  uploadBankStatement,
  getBankStatementDownloadUrl,
  deleteBankStatement,
} from "@/lib/api";
import type { BankStatement } from "@/lib/api";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BankStatementsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await listBankStatements();
      if (!res.ok) {
        if (res.message === "Invalid token") {
          router.push("/login");
          return;
        }
        setError(res.message);
      } else if ("data" in res) {
        setStatements(res.data);
      }
      setLoading(false);
    })();
  }, [router]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      setUploadError("Choose a PDF file.");
      return;
    }
    const file = input.files[0];
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10 MB.");
      return;
    }
    setUploadError("");
    setUploadSuccess("");
    setUploading(true);
    const res = await uploadBankStatement(file);
    setUploading(false);
    if (res.ok && "data" in res) {
      setUploadSuccess(`Uploaded "${res.data.original_filename}".`);
      setStatements((prev) => [res.data, ...prev]);
      input.value = "";
    } else {
      setUploadError(res.message || "Upload failed");
    }
  }

  async function handleDownload(st: BankStatement) {
    const url = await getBankStatementDownloadUrl(st.id);
    if (!url) {
      setError("Download failed");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = st.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(st: BankStatement) {
    if (!confirm(`Delete "${st.original_filename}"? This cannot be undone.`)) return;
    setDeletingId(st.id);
    const res = await deleteBankStatement(st.id);
    setDeletingId(null);
    if (res.ok) {
      setStatements((prev) => prev.filter((s) => s.id !== st.id));
    } else {
      setError(res.message || "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="card max-w-2xl mx-auto text-center py-8 text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (error && !statements.length) {
    return (
      <div className="card max-w-2xl mx-auto">
        <p className="text-[var(--error)] mb-4">{error}</p>
        <p className="text-sm text-[var(--muted)] mb-4">
          You need to be logged in to upload or view bank statements.
        </p>
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Bank statements</h1>
        <Link href="/bank-statements/transactions" className="btn-secondary">
          View all transactions
        </Link>
      </div>

      <div className="card card-hover mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Upload PDF</h3>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="block w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:text-white file:font-medium file:cursor-pointer hover:file:bg-[var(--accent-hover)]"
          />
          {uploadError && (
            <p className="text-sm text-[var(--error)]">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="text-sm text-[var(--success)]">{uploadSuccess}</p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
        <p className="text-xs text-[var(--muted)] mt-2">
          PDF only, max 10 MB.
        </p>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Your uploads</h2>
      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-[var(--border)]">
          {statements.map((st) => (
            <li
              key={st.id}
              className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{st.original_filename}</p>
                <p className="text-sm text-[var(--muted)]">
                  {formatBytes(st.file_size)} ·{" "}
                  {new Date(st.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Link
                  href={`/bank-statements/${st.id}`}
                  className="btn-primary"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownload(st)}
                  className="btn-secondary"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(st)}
                  disabled={deletingId === st.id}
                  className="btn-secondary text-[var(--error)] hover:bg-red-50 hover:border-red-200"
                >
                  {deletingId === st.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {statements.length === 0 && (
          <p className="px-6 py-8 text-center text-[var(--muted)]">
            No bank statements uploaded yet.
          </p>
        )}
      </div>
    </div>
  );
}
