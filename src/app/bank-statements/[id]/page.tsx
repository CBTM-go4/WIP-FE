"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [byMonth, setByMonth] = useState<SpendingByMonthItem[]>([]);
  const [byCategory, setByCategory] = useState<SpendingByCategoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [recurring, setRecurring] = useState<RecurringPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
      const [summaryRes, monthRes, categoryRes, txRes, recurringRes] =
        await Promise.all([
          getStatementSummary(statementId),
          getSpendingByMonth(statementId),
          getSpendingByCategory(statementId),
          getStatementTransactions(statementId),
          getRecurringPayments(statementId),
        ]);

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

  const maxByCategory = useMemo(() => {
    if (byCategory.length === 0) return 1;
    return Math.max(...byCategory.map((c) => c.amount), 1);
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
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Statement #{statementId}
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
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
          Summary
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <p className="text-sm font-medium text-[var(--muted)] mb-1">
              Transactions
            </p>
            <p className="text-xl font-bold text-[var(--text)]">
              {summary?.transaction_count ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-[var(--muted)] mb-1">
              Net total
            </p>
            <p className="text-xl font-bold text-[var(--text)]">
              {summary != null ? formatCurrency(summary.net_total) : "—"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-[var(--muted)] mb-1">
              Total spent
            </p>
            <p className="text-xl font-bold text-[var(--error)]">
              {summary != null ? formatCurrency(summary.total_spent) : "—"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-[var(--muted)] mb-1">
              Total received
            </p>
            <p className="text-xl font-bold text-green-600">
              {summary != null ? formatCurrency(summary.total_received) : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Monthly breakdown: transactions, net total, total spent, total received per month */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
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
              <div key={row.month} className="card">
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
                        row.net >= 0 ? "text-green-600" : "text-[var(--error)]"
                      }`}
                    >
                      {formatCurrency(row.net)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                      Total spent
                    </p>
                    <p className="text-lg font-bold text-[var(--error)] mt-0.5">
                      {formatCurrency(row.spent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                      Total received
                    </p>
                    <p className="text-lg font-bold text-green-600 mt-0.5">
                      {formatCurrency(row.received)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Spending by category */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
          Spending by category
        </h2>
        <div className="card">
          {byCategory.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-4 text-center">
              No category data
            </p>
          ) : (
            <div className="space-y-3">
              {byCategory.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[var(--text)]">
                      {item.category}
                    </span>
                    <span className="text-[var(--muted)]">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{
                        width: `${(item.amount / maxByCategory) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recurring payments */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
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
                  key={r.id ?? i}
                  className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      {r.name ?? r.description ?? "Payment"}
                    </p>
                    {r.frequency && (
                      <p className="text-xs text-[var(--muted)]">
                        {r.frequency}
                        {r.next_date &&
                          ` · Next: ${new Date(r.next_date).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-[var(--text)]">
                    {formatCurrency(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Searchable transactions table */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
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
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--muted)] hidden sm:table-cell">
                      Category
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-[var(--muted)]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4 text-[var(--text)] whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-[var(--text)]">
                        {t.description}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] hidden sm:table-cell">
                        {t.category ?? "—"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                          t.amount >= 0 ? "text-green-600" : "text-[var(--error)]"
                        }`}
                      >
                        {formatCurrency(t.amount)}
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
                  filteredTotal >= 0 ? "text-green-600" : "text-[var(--error)]"
                }`}
              >
                Total: {formatCurrency(filteredTotal)}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
