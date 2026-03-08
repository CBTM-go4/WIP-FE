import Link from "next/link";

export default function Home() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Freedom 35</h1>
      <p className="text-[var(--muted)] mb-8 max-w-md mx-auto">
        A small front end for the brain API. Register, log in, view your
        profile, and browse users.
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        <Link href="/register" className="btn-primary">
          Create account
        </Link>
        <Link href="/login" className="btn-secondary">
          Log in
        </Link>
        <Link href="/users" className="btn-secondary">
          View users
        </Link>
      </div>
    </div>
  );
}
