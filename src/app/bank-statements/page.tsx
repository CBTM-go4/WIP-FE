"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listBankStatements,
  uploadBankStatement,
  getBankStatementDownloadUrl,
  deleteBankStatement,
  getStatementSummary,
} from "@/lib/api";
import type { BankStatement } from "@/lib/api";
import { formatReportDate } from "@/lib/format";
import { ChevronRight, Download, Trash2 } from "lucide-react";

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
  const [parsingStatementId, setParsingStatementId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const POLL_INTERVAL_MS = 2000;
  const POLL_MAX_ATTEMPTS = 60; // 2 minutes

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      input.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10 MB.");
      input.value = "";
      return;
    }
    setUploadError("");
    setUploadSuccess("");
    setUploading(true);
    const res = await uploadBankStatement(file);
    setUploading(false);
    input.value = "";
    if (res.ok && "data" in res) {
      const newStatement = res.data;
      setUploadSuccess(`Uploaded "${newStatement.original_filename}". Parsing…`);
      setStatements((prev) => [newStatement, ...prev]);
      setParsingStatementId(newStatement.id);
    } else {
      setUploadError(res.message || "Upload failed");
    }
  }

  // Poll for parsing completion when we have a newly uploaded statement
  useEffect(() => {
    if (parsingStatementId == null) return;
    let cancelled = false;
    let attempts = 0;
    const runPoll = async () => {
      if (cancelled || attempts >= POLL_MAX_ATTEMPTS) {
        if (!cancelled && attempts >= POLL_MAX_ATTEMPTS) {
          setUploadSuccess((prev) =>
            prev ? prev.replace(/\s*Parsing…\.?$/, " — still processing. Refresh to check.") : prev
          );
        }
        setParsingStatementId(null);
        return;
      }
      attempts += 1;
      const summaryRes = await getStatementSummary(parsingStatementId);
      if (cancelled) return;
      if (summaryRes.ok && "data" in summaryRes) {
        setUploadSuccess((prev) =>
          prev ? prev.replace(/\s*Parsing…\.?$/, " Parsing complete.") : prev
        );
        setParsingStatementId(null);
        return;
      }
      pollTimeoutRef.current = setTimeout(runPoll, POLL_INTERVAL_MS);
    };
    pollTimeoutRef.current = setTimeout(runPoll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [parsingStatementId]);

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
        <Link href="/" className="btn-secondary">
          View all transactions
        </Link>
      </div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Upload PDF</h2>
      <div className="card card-hover mb-6">      
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:text-white file:font-medium file:cursor-pointer hover:file:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {uploadError && (
            <p className="text-sm text-[var(--error)]">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="text-sm text-[var(--success)]">{uploadSuccess}</p>
          )}
          {uploading && (
            <p className="text-sm text-[var(--muted)]">Uploading…</p>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">
          PDF only, max 2 MB.
        </p>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Your uploads</h2>
      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-[var(--border)]">
          {statements.map((st) => (
            <li
              key={st.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/bank-statements/${st.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/bank-statements/${st.id}`);
                }
              }}
              className="group px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{st.original_filename}</p>
                <p className="text-sm text-[var(--muted)]">
                  {formatBytes(st.file_size)} ·{" "}
                  {formatReportDate(st.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <ChevronRight
                  size={20}
                  className="text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => handleDownload(st)}
                  className="p-2 rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)]/50 transition-colors"
                  aria-label="Download"
                >
                  <Download size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(st)}
                  disabled={deletingId === st.id}
                  className="p-2 rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--error)] hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={deletingId === st.id ? "Deleting…" : "Delete"}
                >
                  <Trash2 size={20} />
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
