"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProfile, updateProfile, logout } from "@/lib/api";
import type { User } from "@/lib/api";
import { formatReportDate } from "@/lib/format";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getProfile();
      if (!res.ok) {
        if (res.message === "Invalid token") {
          router.push("/login");
          return;
        }
        setError(res.message);
        setLoading(false);
        return;
      }
      if (res.ok && "data" in res) {
        setUser(res.data);
        setName(res.data.name);
        setEmail(res.data.email);
      }
      setLoading(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const res = await updateProfile(name, email);
    setSaving(false);
    if (res.ok && "data" in res) {
      setUser(res.data);
      setMessage("Profile updated.");
    } else {
      setError(res.message || "Update failed");
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="card max-w-md mx-auto text-center py-8 text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="card max-w-md mx-auto">
        <p className="text-[var(--error)] mb-4">{error}</p>
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Profile</h2>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-[var(--muted)] hover:text-[var(--error)]"
          >
            Log out
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--muted)] mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
              minLength={1}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--muted)] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          {user && (
            <p className="text-sm text-[var(--muted)]">
              Member since {formatReportDate(user.created_at)}
            </p>
          )}
          {message && <p className="text-sm text-[var(--success)]">{message}</p>}
          {error && <p className="text-sm text-[var(--error)]">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
