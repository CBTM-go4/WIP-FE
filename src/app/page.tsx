"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBankStatementStats } from "@/lib/api";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    count: number;
    totalSizeBytes: number;
    latestUploadAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (typeof window !== "undefined" && !localStorage.getItem("token")) {
        router.replace("/login");
        return;
      }
      const res = await getBankStatementStats();
      setLoading(false);
      if (!res.ok && res.message === "Invalid token") {
        router.replace("/login");
        return;
      }
      if (res.ok && "data" in res) {
        setStats(res.data);
      } else {
        setStats({ count: 0, totalSizeBytes: 0, latestUploadAt: null });
      }
    })();
  }, [router]);

  return (
    <div className="py-10">
      <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight mb-2">
        Dashboard
      </h1>
      <p className="text-[var(--muted)] mb-10 max-w-md">
        Overview of your account and bank statements.
      </p>

      {loading ? (
        <div className="card max-w-2xl text-center py-12 text-[var(--muted)]">
          Loading…
        </div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            <div className="card card-hover">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Bank statements
              </p>
              <p className="text-2xl font-bold text-[var(--text)] tabular-nums">
                {stats?.count ?? 0}
              </p>
              <Link
                href="/bank-statements"
                className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] mt-3 inline-flex items-center gap-1 transition-colors"
              >
                View & upload →
              </Link>
            </div>
            <div className="card card-hover">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Total size
              </p>
              <p className="text-2xl font-bold text-[var(--text)] tabular-nums">
                {stats ? formatBytes(stats.totalSizeBytes) : "—"}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                PDFs uploaded
              </p>
            </div>
            <div className="card card-hover sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Latest upload
              </p>
              <p className="text-lg font-semibold text-[var(--text)] tabular-nums">
                {stats?.latestUploadAt
                  ? new Date(stats.latestUploadAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </section>

          <div className="flex gap-3 flex-wrap">
            <Link href="/bank-statements" className="btn-primary">
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
