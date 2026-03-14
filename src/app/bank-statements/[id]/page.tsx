"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  listBankStatements,
  getStatementSummary,
  getSpendingByMonth,
  getSpendingByCategory,
  getStatementTransactions,
  getRecurringPayments,
} from "@/lib/api";
import type {
  StatementSummary,
  SpendingByMonthItem,
  SpendingByCategoryItem,
  TransactionItem,
  RecurringPaymentItem,
} from "@/lib/api";
import { DEMO_HIDE_AMOUNTS } from "@/lib/demo";
import { formatReportDate } from "@/lib/format";

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

/** First letter caps, rest lowercase (title case). */
function formatCategoryName(str: string): string {
  if (!str) return str;
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Format month string (e.g. "2024-01" or "2024-01-15") as "January 2024". */
function formatMonthLabel(monthStr: string): string {
  if (!monthStr) return monthStr;
  const d = new Date(monthStr + (monthStr.length === 7 ? "-01" : ""));
  if (Number.isNaN(d.getTime())) return monthStr;
  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function StatementDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const statementId = params?.id ? Number(params.id) : null;

  const [statementFilename, setStatementFilename] = useState<string | null>(null);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [byMonth, setByMonth] = useState<SpendingByMonthItem[]>([]);
  const [byCategory, setByCategory] = useState<SpendingByCategoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [recurring, setRecurring] = useState<RecurringPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "description" | "category" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        String(t.amount).includes(q)
    );
  }, [transactions, search]);

  const filteredTotal = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
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

  function handleSort(key: "date" | "description" | "category" | "amount") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  /** Per-month stats from transactions: count, net total, total spent, total received. */
  const monthlyBreakdown = useMemo(() => {
    const byMonthKey: Record<
      string,
      { count: number; spent: number; received: number; net: number }
    > = {};
    for (const t of transactions) {
      const dateStr = t.date ? String(t.date).slice(0, 7) : "";
      if (!dateStr) continue;
      if (!byMonthKey[dateStr]) {
        byMonthKey[dateStr] = { count: 0, spent: 0, received: 0, net: 0 };
      }
      const row = byMonthKey[dateStr];
      row.count += 1;
      row.net += t.amount;
      if (t.amount < 0) row.spent += Math.abs(t.amount);
      else row.received += t.amount;
    }
    return Object.entries(byMonthKey)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  useEffect(() => {
    if (statementId == null || isNaN(statementId)) {
      setError("Invalid statement");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError("");
      const [listRes, summaryRes, monthRes, categoryRes, txRes, recurringRes] =
        await Promise.all([
          listBankStatements(),
          getStatementSummary(statementId),
          getSpendingByMonth(statementId),
          getSpendingByCategory(statementId),
          getStatementTransactions(statementId),
          getRecurringPayments(statementId),
        ]);

      if (listRes.ok && "data" in listRes) {
        const st = listRes.data.find((s) => s.id === statementId);
        setStatementFilename(st?.original_filename ?? null);
      }

      if (!summaryRes.ok) {
        if (summaryRes.message === "Invalid token") {
          router.push("/login");
          return;
        }
        setError(summaryRes.message || "Failed to load statement");
        setLoading(false);
        return;
      }

      if (summaryRes.ok && "data" in summaryRes) setSummary(summaryRes.data);
      if (monthRes.ok && "data" in monthRes) setByMonth(monthRes.data);
      if (categoryRes.ok && "data" in categoryRes) setByCategory(categoryRes.data);
      if (txRes.ok && "data" in txRes) setTransactions(txRes.data);
      if (recurringRes.ok && "data" in recurringRes) setRecurring(recurringRes.data);
      setLoading(false);
    })();
  }, [statementId, router]);

  const maxSpendingByCategory = useMemo(() => {
    if (byCategory.length === 0) return 1;
    return Math.max(...byCategory.map((c) => c.spending), 1);
  }, [byCategory]);

  const maxIncomeByCategory = useMemo(() => {
    if (byCategory.length === 0) return 1;
    return Math.max(...byCategory.map((c) => c.income), 1);
  }, [byCategory]);

  if (loading) {
    return (
      <div className="card max-w-4xl mx-auto text-center py-12 text-[var(--muted)]">
        Loading statement…
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
          {statementFilename ?? `Statement #${statementId}`}
        </h1>
        <Link
          href="/bank-statements"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Back to statements
        </Link>
      </div>

      {/* Summary cards */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
          Summary
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="card card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              Transactions
            </p>
            <p className="text-xl font-bold text-[var(--text)] tabular-nums">
              {summary?.transaction_count ?? 0}
            </p>
          </div>
          <div className="card card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              Net total
            </p>
            <p
              className={`text-xl font-bold tabular-nums ${
                summary == null
                  ? "text-[var(--text)]"
                  : summary.net_total < 0
                    ? "text-[var(--error)]"
                    : "text-[var(--success)]"
              }`}
            >
              {summary != null ? formatDisplayAmount(summary.net_total) : "—"}
            </p>
          </div>
          <div className="card card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              Total spent
            </p>
            <p className="text-xl font-bold text-[var(--error)] tabular-nums">
              {summary != null ? formatDisplayAmount(summary.total_spent) : "—"}
            </p>
          </div>
          <div className="card card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              Total received
            </p>
            <p className="text-xl font-bold text-[var(--success)] tabular-nums">
              {summary != null ? formatDisplayAmount(summary.total_received) : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Monthly breakdown: transactions, net total, total spent, total received per month */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
          By month
        </h2>
        {monthlyBreakdown.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[var(--muted)] py-4 text-center">
              No transactions to break down by month
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {monthlyBreakdown.map((row) => (
              <div key={row.month} className="card card-hover">
                <h3 className="font-semibold text-[var(--text)] mb-4">
                  {formatMonthLabel(row.month)}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                      Transactions
                    </p>
                    <p className="text-lg font-bold text-[var(--text)] mt-0.5">
                      {row.count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                      Net total
                    </p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${
                        row.net >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"
                      }`}
                    >
                      {formatDisplayAmount(row.net)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                      Total spent
                    </p>
                    <p className="text-lg font-bold text-[var(--error)] mt-0.5">
                      {formatDisplayAmount(row.spent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                      Total received
                    </p>
                    <p className="text-lg font-bold mt-0.5">
                      {formatDisplayAmount(row.received)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Spending by category & Income by category */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
            Spending by category
          </h2>
          <div className="card">
            {byCategory.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-4 text-center">
                No category data
              </p>
            ) : (
              <div className="space-y-3">
                {byCategory
                  .filter((item) => item.spending > 0)
                  .map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-[var(--text)]">
                          {formatCategoryName(item.category)}
                        </span>
                        <span className="text-[var(--muted)]">
                          {formatDisplayAmount(item.spending)}
                          {item.frequency > 0 && (
                            <span className="ml-1">
                              · {item.frequency} txns
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--success)] min-w-[2px]"
                          style={{
                            width: `${(item.spending / maxSpendingByCategory) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                {byCategory.filter((item) => item.spending > 0).length === 0 && (
                  <p className="text-sm text-[var(--muted)] py-2 text-center">
                    No spending by category
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
            Income by category
          </h2>
          <div className="card">
            {byCategory.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-4 text-center">
                No category data
              </p>
            ) : (
              <div className="space-y-3">
                {byCategory
                  .filter((item) => item.income > 0)
                  .map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-[var(--text)]">
                          {formatCategoryName(item.category)}
                        </span>
                        <span className="text-[var(--muted)]">
                          {formatDisplayAmount(item.income)}
                          {item.frequency > 0 && (
                            <span className="ml-1">
                              · {item.frequency} txns
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--success)] min-w-[2px]"
                          style={{
                            width: `${(item.income / maxIncomeByCategory) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                {byCategory.filter((item) => item.income > 0).length === 0 && (
                  <p className="text-sm text-[var(--muted)] py-2 text-center">
                    No income by category
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recurring payments */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
          Recurring payments
        </h2>
        <div className="card p-0 overflow-hidden">
          {recurring.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-8 text-center px-4">
              No recurring payments identified
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recurring.map((r, i) => (
                <li
                  key={`${r.merchant}-${i}`}
                  className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text)] truncate">
                      {r.merchant}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {r.frequency}
                      {r.transaction_count > 0 &&
                        ` · ${r.transaction_count} transaction${r.transaction_count !== 1 ? "s" : ""}`}
                      {" · "}
                      First: {formatReportDate(r.first_seen)} · Last:{" "}
                      {formatReportDate(r.last_seen)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-[var(--text)]">
                      Avg {formatDisplayAmount(r.average_amount)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Last {formatDisplayAmount(r.last_amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Searchable transactions table */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
          Transactions
        </h2>
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <input
              type="search"
              placeholder="Search by description, category, amount…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              aria-label="Search transactions"
            />
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-8 text-center px-4">
                {transactions.length === 0
                  ? "No transactions"
                  : "No transactions match your search"}
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
                      key={t.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4 text-[var(--text)] whitespace-nowrap">
                        {formatReportDate(t.date)}
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
        </div>
      </section>
    </div>
  );
}
