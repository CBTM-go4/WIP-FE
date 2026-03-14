"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-2">
        Rules
      </h1>
      <p className="text-[var(--muted)] mb-6">
        This page is not built yet. Rules and automation will be configured here.
      </p>
      <Link href="/" className="btn-secondary">
        ← Back to dashboard
      </Link>
    </div>
  );
}
