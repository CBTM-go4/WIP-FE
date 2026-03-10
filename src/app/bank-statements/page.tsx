"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listBankStatements,
  uploadBankStatement,
  getBankStatementDownloadUrl,
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

  const loadList = async () => {
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
  };

  useEffect(() => {
    loadList();
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
      <h2 className="text-xl font-semibold mb-4">Bank statements</h2>

      <div className="card mb-6">
        <h3 className="font-medium mb-3">Upload PDF</h3>
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
            <p className="text-sm text-green-600">{uploadSuccess}</p>
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

      <h3 className="font-medium mb-2">Your uploads</h3>
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
              <button
                type="button"
                onClick={() => handleDownload(st)}
                className="btn-secondary shrink-0"
              >
                Download
              </button>
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
