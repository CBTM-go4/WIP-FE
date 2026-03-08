"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listUsers } from "@/lib/api";
import type { User } from "@/lib/api";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await listUsers();
      if (!res.ok) {
        if (res.message === "Invalid token") {
          router.push("/login");
          return;
        }
        setError(res.message);
      } else if ("data" in res) {
        setUsers(res.data);
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="card max-w-2xl mx-auto text-center py-8 text-[var(--muted)]">
        Loading users…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-2xl mx-auto">
        <p className="text-[var(--error)] mb-4">{error}</p>
        <p className="text-sm text-[var(--muted)] mb-4">
          You need to be logged in to view the user list.
        </p>
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Users</h2>
      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-[var(--border)]">
          {users.map((user) => (
            <li
              key={user.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
            >
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-[var(--muted)]">{user.email}</p>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
        {users.length === 0 && (
          <p className="px-6 py-8 text-center text-[var(--muted)]">
            No users yet.
          </p>
        )}
      </div>
    </div>
  );
}
