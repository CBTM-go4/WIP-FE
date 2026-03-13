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

  const navLink =
    "text-sm font-medium text-[var(--text-soft)] hover:text-[var(--accent)] transition-colors py-2 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--accent-muted)]/50";

  if (!mounted) {
    return (
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm" style={{ boxShadow: "var(--shadow)" }}>
        <nav className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[var(--text)] tracking-tight">
            Freedom 35
          </Link>
          <div className="flex gap-1">
            <span className="text-[var(--muted)]">…</span>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm" style={{ boxShadow: "var(--shadow)" }}>
      <nav className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-[var(--text)] tracking-tight hover:text-[var(--accent)] transition-colors">
          Freedom 35
        </Link>
        <div className="flex items-center gap-1">
          {isLoggedIn ? (
            <>
              <Link href="/profile" className={navLink}>
                Profile
              </Link>
              <Link href="/users" className={navLink}>
                Users
              </Link>
              <Link href="/bank-statements" className={navLink}>
                Bank statements
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`${navLink} cursor-pointer bg-transparent border-none font-inherit`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link href="/register" className={navLink}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
