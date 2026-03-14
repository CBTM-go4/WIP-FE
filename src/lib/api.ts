const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T; token?: string }
  | { ok: false; message: string; error?: string };

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      message: json.message || "Request failed",
      error: json.error,
    };
  }
  return json as ApiResponse<T>;
}

export async function register(name: string, email: string, password: string) {
  const res = await api<User>("auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return res;
}

export async function login(email: string, password: string) {
  const res = await api<User & { token?: string }>("auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (res.ok && "token" in res && res.token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token);
    }
  }
  return res;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    window.dispatchEvent(new CustomEvent("auth-change"));
  }
}

export async function getProfile() {
  return api<User>("profile");
}

export async function updateProfile(name: string, email: string) {
  return api<User>("profile", {
    method: "PUT",
    body: JSON.stringify({ name, email }),
  });
}

export async function listUsers() {
  return api<User[]>("users");
}

export async function getUserById(id: number) {
  return api<User>(`users/${id}`);
}

// --- Bank statements ---

export type BankStatement = {
  id: number;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  created_at: string;
};

export async function uploadBankStatement(file: File): Promise<ApiResponse<BankStatement>> {
  const token = getToken();
  if (!token) {
    return { ok: false, message: "Not logged in" };
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}bank-statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      message: json.message || "Upload failed",
      error: json.error,
    };
  }
  return json as ApiResponse<BankStatement>;
}

export async function listBankStatements() {
  return api<BankStatement[]>("bank-statements");
}

/**
 * DELETE /bank-statements/:id (requires Bearer token).
 * Success: { ok: true, data }. 404: { ok: false, message: "Bank statement not found" }.
 */
export async function deleteBankStatement(id: number) {
  return api<unknown>(`bank-statements/${id}`, { method: "DELETE" });
}

/** Aggregated stats from bank statements (derived from list). */
export type BankStatementStats = {
  count: number;
  totalSizeBytes: number;
  latestUploadAt: string | null;
};

export async function getBankStatementStats(): Promise<
  ApiResponse<BankStatementStats>
> {
  const res = await listBankStatements();
  if (!res.ok) return res;
  if (!("data" in res)) return res;
  const list = res.data;
  const totalSizeBytes = list.reduce((sum, s) => sum + s.file_size, 0);
  const latestUploadAt =
    list.length > 0
      ? list.reduce((latest, s) =>
          s.created_at > latest ? s.created_at : latest
        , list[0].created_at)
      : null;
  return {
    ok: true,
    data: {
      count: list.length,
      totalSizeBytes,
      latestUploadAt,
    },
  };
}

// --- Statement detail dashboard (summary, spending, transactions, recurring) ---

export type StatementSummary = {
  transaction_count: number;
  net_total: number;
  total_spent: number;
  total_received: number;
};

export type SpendingByMonthItem = {
  month: string;
  spent?: number;
  income?: number;
  spending?: number;
};

export type SpendingByCategoryItem = {
  category: string;
  total: number;
};

export type TransactionItem = {
  id: string | number;
  date: string;
  description: string;
  amount: number;
  category?: string;
};

export type RecurringPaymentItem = {
  id?: string | number;
  name?: string;
  description?: string;
  amount: number;
  frequency?: string;
  next_date?: string;
};

export async function getStatementSummary(id: number) {
  return api<StatementSummary>(`bank-statements/${id}/summary`);
}

export async function getSpendingByMonth(id: number) {
  return api<SpendingByMonthItem[]>(`bank-statements/${id}/spending-by-month`);
}

export async function getSpendingByCategory(id: number) {
  return api<SpendingByCategoryItem[]>(`bank-statements/${id}/spending-by-category`);
}

export async function getStatementTransactions(id: number) {
  return api<TransactionItem[]>(`bank-statements/${id}/transactions`);
}

export async function getRecurringPayments(id: number) {
  return api<RecurringPaymentItem[]>(`bank-statements/${id}/recurring-payments`);
}

/** Fetch the PDF blob and return an object URL for download/preview. Call revokeObjectURL when done. */
export async function getBankStatementDownloadUrl(id: number): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}bank-statements/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
