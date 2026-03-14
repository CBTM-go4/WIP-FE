"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import {
  ChevronDown,
  LogOut,
  FileText,
  Users,
  Menu,
  X,
  ScrollText,
} from "lucide-react";

export default function HeaderNav() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(e.target as Node)
      ) {
        setAdminOpen(false);
      }
    }
    if (adminOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [adminOpen]);

  function handleLogout() {
    logout();
    setIsLoggedIn(false);
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  const baseLink =
    "flex items-center gap-2 text-sm font-medium text-[var(--text-soft)] hover:text-[var(--accent)] transition-colors py-2 px-3 rounded-lg hover:bg-[var(--accent-muted)]/50";

  if (!mounted) {
    return (
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <nav className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold text-[var(--text)] tracking-tight"
          >
            Freedom 35
          </Link>
          <div className="flex gap-1">
            <span className="text-[var(--muted)]">…</span>
          </div>
        </nav>
      </header>
    );
  }

  const desktopNav = isLoggedIn ? (
    <div className="hidden sm:flex items-center gap-0.5">
      <Link href="/bank-statements" className={baseLink}>
        <FileText size={18} aria-hidden />
        Statements
      </Link>
      <div className="relative" ref={adminDropdownRef}>
        <button
          type="button"
          onClick={() => setAdminOpen((v) => !v)}
          className={`${baseLink} cursor-pointer border-none bg-transparent font-inherit ${
            adminOpen ? "text-[var(--accent)] bg-[var(--accent-muted)]/50" : ""
          }`}
          aria-expanded={adminOpen}
          aria-haspopup="true"
        >
          Admin
          <ChevronDown
            size={16}
            className={`transition-transform ${adminOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {adminOpen && (
          <div
            className="absolute right-0 top-full mt-1 py-1.5 min-w-[10rem] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg z-30"
            role="menu"
          >
            <Link
              href="/users"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)] transition-colors"
              role="menuitem"
              onClick={() => setAdminOpen(false)}
            >
              <Users size={18} className="text-[var(--muted)]" aria-hidden />
              Users
            </Link>
            <Link
              href="/rules"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)] transition-colors"
              role="menuitem"
              onClick={() => setAdminOpen(false)}
            >
              <ScrollText size={18} className="text-[var(--muted)]" aria-hidden />
              Rules
            </Link>
          </div>
        )}
      </div>
      <Link href="/profile" className={baseLink}>
        Profile
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className={`${baseLink} cursor-pointer border-none bg-transparent font-inherit text-[var(--muted)] hover:text-[var(--error)]`}
      >
        <LogOut size={18} aria-hidden />
        Log out
      </button>
    </div>
  ) : (
    <div className="hidden sm:flex items-center gap-0.5">
      <Link href="/login" className={baseLink}>
        Log in
      </Link>
      <Link href="/register" className={baseLink}>
        Register
      </Link>
    </div>
  );

  const mobileNav = isLoggedIn ? (
    <div className="sm:hidden relative">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="p-2 rounded-lg text-[var(--text-soft)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)]/50 transition-colors"
        aria-expanded={mobileOpen}
        aria-label="Open menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-10 bg-black/20"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 py-2 min-w-[12rem] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-20"
            role="menu"
          >
            <Link
              href="/bank-statements"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--accent-muted)]/50"
              onClick={() => setMobileOpen(false)}
            >
              <FileText size={18} />
              Statements
            </Link>
            <div className="border-t border-[var(--border)] my-1 pt-1">
              <span className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Admin
              </span>
              <Link
                href="/users"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--accent-muted)]/50"
                onClick={() => setMobileOpen(false)}
              >
                <Users size={18} />
                Users
              </Link>
              <Link
                href="/rules"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--accent-muted)]/50"
                onClick={() => setMobileOpen(false)}
              >
                <ScrollText size={18} />
                Rules
              </Link>
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--accent-muted)]/50 border-t border-[var(--border)]"
              onClick={() => setMobileOpen(false)}
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-left text-[var(--muted)] hover:text-[var(--error)] hover:bg-red-50/50 transition-colors"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  ) : (
    <div className="flex sm:hidden items-center gap-1">
      <Link href="/login" className={baseLink}>
        Log in
      </Link>
      <Link href="/register" className={baseLink}>
        Register
      </Link>
    </div>
  );

  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <nav className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold text-[var(--text)] tracking-tight hover:text-[var(--accent)] transition-colors"
        >
          Freedom 35
        </Link>
        {desktopNav}
        {mobileNav}
      </nav>
    </header>
  );
}
