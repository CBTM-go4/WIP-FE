"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listBankStatements, getStatementTransactions } from "@/lib/api";
import type { BankStatement, TransactionItem } from "@/lib/api";
import { DEMO_HIDE_AMOUNTS } from "@/lib/demo";
import { formatReportDate, formatMonthLabel, formatStatementTitle } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight } from "lucide-react";

type TransactionWithStatement = TransactionItem & {
  statementId: number;
  statementLabel: string;
};

function getMonthKey(dateStr: string): string {
  return dateStr ? String(dateStr).slice(0, 7) : "";
}

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

type MonthTotals = {
  monthKey: string;
  count: number;
  spent: number;
  received: number;
  net: number;
};

type StatementTotals = {
  statementId: number;
  statementLabel: string;
  statementTitle: string;
  dateRange: { min: string; max: string } | null;
  months: MonthTotals[];
  count: number;
  spent: number;
  received: number;
  net: number;
};

export default function Home() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithStatement[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [sortKey, setSortKey] = useState<
    "date" | "statement" | "description" | "category" | "amount"
  >("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      if (typeof window !== "undefined" && !localStorage.getItem("token")) {
        router.replace("/login");
        return;
      }
      setLoading(true);
      setError("");
      const statementsRes = await listBankStatements();
      if (!statementsRes.ok) {
        if (statementsRes.message === "Invalid token") {
          router.replace("/login");
          return;
        }
        setError(statementsRes.message || "Failed to load statements");
        setLoading(false);
        return;
      }
      if (!("data" in statementsRes) || !statementsRes.data.length) {
        router.replace("/bank-statements");
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
      if (merged.length === 0) {
        router.replace("/bank-statements");
        return;
      }
      setTransactions(merged);
      setLoading(false);
    })();
  }, [router]);

  const filteredTransactions = useMemo(() => {
    const list = transactions;
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        (t.normalized_description && t.normalized_description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        String(t.amount).includes(q) ||
        t.statementLabel.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const activeFilterLabel = useMemo(() => {
    const q = search.trim();
    return q ? `Filtered by: “${q}”` : "";
  }, [search]);

  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortKey === "statement") {
        cmp = (a.statementLabel ?? "").localeCompare(b.statementLabel ?? "");
      } else if (sortKey === "description") {
        cmp = (a.normalized_description ?? a.description ?? "").localeCompare(
          b.normalized_description ?? b.description ?? ""
        );
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

  const totalsByStatement = useMemo((): StatementTotals[] => {
    const byStatement = new Map<
      number,
      { statementLabel: string; transactions: TransactionWithStatement[] }
    >();
    for (const t of filteredTransactions) {
      const ex = byStatement.get(t.statementId);
      if (!ex) {
        byStatement.set(t.statementId, {
          statementLabel: t.statementLabel,
          transactions: [t],
        });
      } else {
        ex.transactions.push(t);
      }
    }
    const result: StatementTotals[] = [];
    for (const [statementId, { statementLabel, transactions: txList }] of
      byStatement.entries()) {
      const dates = txList.map((t) => t.date).filter(Boolean);
      const dateRange =
        dates.length > 0
          ? {
              min: dates.reduce((a, b) => (a < b ? a : b)),
              max: dates.reduce((a, b) => (a > b ? a : b)),
            }
          : null;
      const statementTitle = formatStatementTitle(statementLabel, dateRange);

      const byMonth = new Map<string, TransactionWithStatement[]>();
      for (const t of txList) {
        const key = getMonthKey(t.date);
        if (!key) continue;
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)!.push(t);
      }
      const monthKeys = Array.from(byMonth.keys()).sort().reverse();
      const months: MonthTotals[] = monthKeys.map((monthKey) => {
        const list = byMonth.get(monthKey)!;
        const spent = list
          .filter((t) => t.amount < 0)
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const received = list
          .filter((t) => t.amount >= 0)
          .reduce((s, t) => s + t.amount, 0);
        const net = list.reduce((s, t) => s + t.amount, 0);
        return {
          monthKey,
          count: list.length,
          spent,
          received,
          net,
        };
      });
      const spent = months.reduce((s, m) => s + m.spent, 0);
      const received = months.reduce((s, m) => s + m.received, 0);
      const net = months.reduce((s, m) => s + m.net, 0);
      result.push({
        statementId,
        statementLabel,
        statementTitle,
        dateRange,
        months,
        count: txList.length,
        spent,
        received,
        net,
      });
    }
    result.sort((a, b) => {
      const aMax = a.dateRange ? new Date(a.dateRange.max).getTime() : 0;
      const bMax = b.dateRange ? new Date(b.dateRange.max).getTime() : 0;
      return bMax - aMax;
    });
    return result;
  }, [filteredTransactions]);

  if (loading) {
    return (
      <div className="card max-w-4xl mx-auto text-center py-12 text-[var(--muted)]">
        Loading…
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
          Dashboard
        </h1>
        <Link
          href="/bank-statements"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          View statements →
        </Link>
      </div>

      {search.trim() && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--accent-muted)]/15 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)] truncate">
              {activeFilterLabel}
            </p>
            <p className="text-xs text-[var(--muted)]">
              This filter affects the totals and statement blocks below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="btn-secondary py-2 px-3 text-sm"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_auto_minmax(0,1fr)] md:items-stretch">
        <div className="card card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
            Net total
          </p>
          <p
            className={`text-3xl font-bold ${
              filteredTotal >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {formatDisplayAmount(filteredTotal)}
          </p>
        </div>
        <div className="hidden md:flex flex-col items-center justify-center gap-6 px-1">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-500/15 text-[var(--error)] border border-red-400/25">
            <ArrowUpRight className="w-5 h-5" />
          </span>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/15 text-[var(--success)] border border-emerald-400/25">
            <ArrowDownLeft className="w-5 h-5" />
          </span>
        </div>
        <div className="grid gap-4">
          <div className="card card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              Out
            </p>
            <p className="text-xl font-bold text-[var(--error)]">
              {formatDisplayAmount(totalSpent)}
            </p>
          </div>
          <div className="card card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              In
            </p>
            <p className="text-xl font-bold text-[var(--success)]">
              {formatDisplayAmount(totalReceived)}
            </p>
          </div>
        </div>
      </section>

      {/* Totals by statement */}
      {totalsByStatement.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                Statements
              </span>
              <h2 className="text-sm font-semibold text-[var(--text)]">
                Overview
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {totalsByStatement.length} file{totalsByStatement.length === 1 ? "" : "s"}
            </p>
          </div>
          {totalsByStatement.map((stmt) => {
            return (
              <div key={stmt.statementId} className="space-y-2">
                <div className="w-full text-left flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]/55 backdrop-blur-xl px-3 py-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="min-w-0">
                      <Link
                        href={`/bank-statements/${stmt.statementId}`}
                        className="block text-sm font-semibold text-[var(--text)] truncate hover:text-[var(--accent)] transition-colors"
                        title={stmt.statementLabel}
                      >
                        {stmt.statementTitle || stmt.statementLabel}
                      </Link>
                      <span className="block text-[11px] text-[var(--muted)] truncate">
                        {stmt.dateRange
                          ? `${formatReportDate(stmt.dateRange.min)} – ${formatReportDate(
                              stmt.dateRange.max
                            )}`
                          : stmt.statementLabel}
                      </span>
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]/45 backdrop-blur-xl px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Tx
                    </p>
                    <p className="text-base font-semibold text-[var(--text)] tabular-nums">
                      {stmt.count}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]/45 backdrop-blur-xl px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Net
                    </p>
                    <p
                      className={`text-base font-semibold tabular-nums ${
                        stmt.net >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"
                      }`}
                    >
                      {formatDisplayAmount(stmt.net)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]/45 backdrop-blur-xl px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Out
                    </p>
                    <p className="text-base font-semibold text-[var(--error)] tabular-nums">
                      {formatDisplayAmount(stmt.spent)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]/45 backdrop-blur-xl px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      In
                    </p>
                    <p className="text-base font-semibold text-[var(--success)] tabular-nums">
                      {formatDisplayAmount(stmt.received)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* All transactions (collapsed by default), search and filter inside this block */}
      <section>
        <div className="card p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAllTransactions((v) => !v)}
            className="flex items-center justify-between w-full p-4 border-b border-[var(--border)] hover:bg-[var(--accent-muted)] transition-colors text-left"
          >
            <span className="font-medium text-[var(--text)]">
              All transactions
            </span>
            <span className="text-[var(--muted)]">
              {showAllTransactions ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          </button>
          {showAllTransactions && (
            <>
              <div className="p-4 border-b border-[var(--border)] space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="search"
                    placeholder="Search by description, category, amount, statement…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                    aria-label="Search transactions"
                  />
                  {search.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="btn-secondary py-2.5 px-3 whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {search.trim() && (
                  <p className="text-xs text-[var(--muted)]">
                    You’re viewing a filtered dashboard — totals and statement blocks above reflect this search.
                  </p>
                )}
              </div>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-8 text-center px-4">
                No transactions match your search or filter.
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
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent-muted)]/60"
                    >
                      <td className="py-3 px-4 text-[var(--text)] whitespace-nowrap">
                        {formatReportDate(t.date)}
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
                      <td className="py-3 px-4 text-[var(--text)]" title={t.description ?? undefined}>
                        {t.normalized_description ?? t.description}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] hidden sm:table-cell">
                        {t.category
                          ? t.category.charAt(0).toUpperCase() + t.category.slice(1)
                          : "—"}
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
                {search.trim() ? " (filtered)" : ""}
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
            </>
          )}
        </div>
      </section>
    </div>
  );
}
