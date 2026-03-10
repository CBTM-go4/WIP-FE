import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F35",
  description: "Work in progress – auth & users",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}
      >
        <header className="border-b border-[var(--border)] bg-[var(--card)]">
          <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-[var(--text)]">
              Freedom 35
            </Link>
            <div className="flex gap-4">
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
                Bank statements wip
              </Link>
            </div>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
