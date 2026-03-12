"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

export default function HeaderNav() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncAuth = () => {
      if (typeof window !== "undefined") {
        setIsLoggedIn(!!localStorage.getItem("token"));
      }
    };
    syncAuth();
    window.addEventListener("auth-change", syncAuth);
    return () => window.removeEventListener("auth-change", syncAuth);
  }, []);

  function handleLogout() {
    logout();
    setIsLoggedIn(false);
    router.push("/login");
    router.refresh();
  }

  if (!mounted) {
    return (
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-[var(--text)]">
            Freedom 35
          </Link>
          <div className="flex gap-4">
            <span className="text-[var(--muted)]">…</span>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-[var(--text)]">
          Freedom 35
        </Link>
        <div className="flex gap-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/users"
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              >
                Users
              </Link>
              <Link
                href="/bank-statements"
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              >
                Bank statements
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors bg-transparent border-none cursor-pointer font-inherit"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
