"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getBankStatementStats } from "@/lib/api";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [stats, setStats] = useState<{
    count: number;
    totalSizeBytes: number;
    latestUploadAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await getBankStatementStats();
      setLoading(false);
      if (res.ok && "data" in res) {
        setStats(res.data);
      } else {
        setStats({ count: 0, totalSizeBytes: 0, latestUploadAt: null });
      }
    })();
  }, []);

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Dashboard</h1>
      <p className="text-[var(--muted)] mb-8 max-w-md">
        Overview of your account and bank statements.
      </p>

      {loading ? (
        <div className="card max-w-2xl text-center py-8 text-[var(--muted)]">
          Loading…
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="card">
              <p className="text-sm font-medium text-[var(--muted)] mb-1">
                Bank statements
              </p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {stats?.count ?? 0}
              </p>
              <Link
                href="/bank-statements"
                className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block"
              >
                View & upload →
              </Link>
            </div>
            <div className="card">
              <p className="text-sm font-medium text-[var(--muted)] mb-1">
                Total size
              </p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {stats ? formatBytes(stats.totalSizeBytes) : "—"}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                PDFs uploaded
              </p>
            </div>
            <div className="card sm:col-span-2 lg:col-span-1">
              <p className="text-sm font-medium text-[var(--muted)] mb-1">
                Latest upload
              </p>
              <p className="text-lg font-semibold text-[var(--text)]">
                {stats?.latestUploadAt
                  ? new Date(stats.latestUploadAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </section>

          <div className="flex gap-4 flex-wrap">
            <Link href="/register" className="btn-primary">
              Create account
            </Link>
            <Link href="/login" className="btn-secondary">
              Log in
            </Link>
            <Link href="/bank-statements" className="btn-secondary">
              Bank statements
            </Link>
            <Link href="/users" className="btn-secondary">
              View users
            </Link>
            <Link href="/profile" className="btn-secondary">
              Profile
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
