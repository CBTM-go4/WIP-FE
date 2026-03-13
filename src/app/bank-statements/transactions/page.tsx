"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listBankStatements, getStatementTransactions } from "@/lib/api";
import type { BankStatement, TransactionItem } from "@/lib/api";
import { DEMO_HIDE_AMOUNTS } from "@/lib/demo";

type TransactionWithStatement = TransactionItem & {
  statementId: number;
  statementLabel: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDisplayAmount(amount: number): string {
  return DEMO_HIDE_AMOUNTS ? "R xxx" : formatCurrency(amount);
}

export default function AllTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithStatement[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statementFilter, setStatementFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<
    "date" | "statement" | "description" | "category" | "amount"
  >("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      const statementsRes = await listBankStatements();
      if (!statementsRes.ok) {
        if (statementsRes.message === "Invalid token") {
          router.push("/login");
          return;
        }
        setError(statementsRes.message || "Failed to load statements");
        setLoading(false);
        return;
      }
      if (!("data" in statementsRes) || !statementsRes.data.length) {
        setTransactions([]);
        setLoading(false);
        return;
      }
      const statements = statementsRes.data as BankStatement[];
      const txResults = await Promise.all(
        statements.map((st) => getStatementTransactions(st.id))
      );
      const merged: TransactionWithStatement[] = [];
      txResults.forEach((res, i) => {
        if (res.ok && "data" in res) {
          const st = statements[i];
          for (const t of res.data) {
            merged.push({
              ...t,
              statementId: st.id,
              statementLabel: st.original_filename,
            });
          }
        }
      });
      merged.sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(merged);
      setLoading(false);
    })();
  }, [router]);

  const statementOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const t of transactions) {
      if (!seen.has(t.statementId)) seen.set(t.statementId, t.statementLabel);
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (statementFilter) {
      const id = Number(statementFilter);
      if (!Number.isNaN(id)) list = list.filter((t) => t.statementId === id);
    }
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        String(t.amount).includes(q) ||
        t.statementLabel.toLowerCase().includes(q)
    );
  }, [transactions, search, statementFilter]);

  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortKey === "statement") {
        cmp = (a.statementLabel ?? "").localeCompare(b.statementLabel ?? "");
      } else if (sortKey === "description") {
        cmp = (a.description ?? "").localeCompare(b.description ?? "");
      } else if (sortKey === "category") {
        cmp = (a.category ?? "").localeCompare(b.category ?? "");
      } else if (sortKey === "amount") {
        cmp = a.amount - b.amount;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredTransactions, sortKey, sortDir]);

  function handleSort(
    key: "date" | "statement" | "description" | "category" | "amount"
  ) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const filteredTotal = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const totalSpent = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [filteredTransactions]
  );
  const totalReceived = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.amount >= 0)
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  if (loading) {
    return (
      <div className="card max-w-4xl mx-auto text-center py-12 text-[var(--muted)]">
        Loading all transactions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-4xl mx-auto">
        <p className="text-[var(--error)] mb-4">{error}</p>
        <Link href="/bank-statements" className="btn-primary">
          Back to statements
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
          All statement transactions
        </h1>
        <Link
          href="/bank-statements"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Back to statements
        </Link>
      </div>

      {/* Summary cards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="card card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
            Transactions
          </p>
          <p className="text-xl font-bold text-[var(--text)]">
            {filteredTransactions.length}
          </p>
        </div>
        <div className="card card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
            Net total
          </p>
          <p
            className={`text-xl font-bold ${
              filteredTotal >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {formatDisplayAmount(filteredTotal)}
          </p>
        </div>
        <div className="card card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
            Total spent
          </p>
          <p className="text-xl font-bold text-[var(--error)]">
            {formatDisplayAmount(totalSpent)}
          </p>
        </div>
        <div className="card card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
            Total received
          </p>
          <p className="text-xl font-bold text-[var(--success)]">
            {formatDisplayAmount(totalReceived)}
          </p>
        </div>
      </section>

      {/* Filters and table */}
      <section>
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <input
              type="search"
              placeholder="Search by description, category, amount, statement…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              aria-label="Search transactions"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="statement-filter" className="text-sm text-[var(--muted)]">
                Statement:
              </label>
              <select
                id="statement-filter"
                value={statementFilter}
                onChange={(e) => setStatementFilter(e.target.value)}
                className="input py-1.5 max-w-xs"
              >
                <option value="">All statements</option>
                {statementOptions.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-8 text-center px-4">
                {transactions.length === 0
                  ? "No transactions. Upload statements to see transactions here."
                  : "No transactions match your search or filter."}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--card)] shadow-sm">
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => handleSort("date")}
                        className="flex items-center gap-1 hover:text-[var(--accent)] cursor-pointer"
                      >
                        Date {sortKey === "date" && (sortDir === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => handleSort("statement")}
                        className="flex items-center gap-1 hover:text-[var(--accent)] cursor-pointer"
                      >
                        Statement {sortKey === "statement" && (sortDir === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => handleSort("description")}
                        className="flex items-center gap-1 hover:text-[var(--accent)] cursor-pointer"
                      >
                        Description {sortKey === "description" && (sortDir === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted)] hidden sm:table-cell">
                      <button
                        type="button"
                        onClick={() => handleSort("category")}
                        className="flex items-center gap-1 hover:text-[var(--accent)] cursor-pointer"
                      >
                        Category {sortKey === "category" && (sortDir === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => handleSort("amount")}
                        className="flex items-center gap-1 hover:text-[var(--accent)] cursor-pointer inline-flex ml-auto"
                      >
                        Amount {sortKey === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((t) => (
                    <tr
                      key={`${t.statementId}-${t.id}`}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4 text-[var(--text)] whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-[var(--text)]">
                        <Link
                          href={`/bank-statements/${t.statementId}`}
                          className="text-[var(--accent)] hover:underline truncate max-w-[120px] sm:max-w-[180px] inline-block"
                          title={t.statementLabel}
                        >
                          {t.statementLabel}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[var(--text)]">
                        {t.description}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] hidden sm:table-cell">
                        {t.category ?? "—"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                          t.amount >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"
                        }`}
                      >
                        {formatDisplayAmount(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {filteredTransactions.length > 0 && (
            <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--card)] flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-[var(--muted)]">
                {filteredTransactions.length} transaction
                {filteredTransactions.length !== 1 ? "s" : ""}
                {(search.trim() || statementFilter) ? " (filtered)" : ""}
              </span>
              <span
                className={`font-semibold ${
                  filteredTotal >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"
                }`}
              >
                Total: {formatDisplayAmount(filteredTotal)}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
