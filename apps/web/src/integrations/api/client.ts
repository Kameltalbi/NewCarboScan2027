/**
 * Client API Newcarboscan-2027 — remplace @supabase/supabase-js.
 */

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8080" : "");

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string | null;
  organizationId?: string;
  role?: string;
};

/** Compat types for legacy imports */
export type User = AuthUser;
export type Session = {
  user: AuthUser;
  access_token: string;
};

const TOKEN_KEY = "ncs_token";
const ORG_KEY = "ncs_org_id";
const USER_KEY = "ncs_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredOrgId(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(input: {
  token: string;
  user: AuthUser;
  organizationId?: string;
}) {
  localStorage.setItem(TOKEN_KEY, input.token);
  localStorage.setItem(USER_KEY, JSON.stringify(input.user));
  if (input.organizationId) {
    localStorage.setItem(ORG_KEY, input.organizationId);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
  localStorage.removeItem("ncs_session");
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: { auth?: boolean } = { auth: true },
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.auth !== false) {
    const token = getStoredToken();
    const orgId = getStoredOrgId();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (orgId) headers.set("X-Organization-Id", orgId);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : body?.error
          ? JSON.stringify(body.error)
          : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export type LeadInput = {
  requestType: string;
  email: string;
  phone?: string;
  companyName?: string;
  fullName?: string;
  message?: string;
  payload?: Record<string, unknown>;
};

export const api = {
  health: () => request<{ ok: boolean }>("/health", {}, { auth: false }),

  login: async (email: string, password: string) => {
    const data = await request<{
      token: string;
      user: AuthUser;
      organizations: Array<{ organization_id: string; role: string }>;
    }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      { auth: false },
    );
    persistSession({
      token: data.token,
      user: {
        ...data.user,
        organizationId: data.organizations[0]?.organization_id,
        role: data.organizations[0]?.role,
      },
      organizationId: data.organizations[0]?.organization_id,
    });
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    sector?: string;
    phone?: string;
  }) => {
    const data = await request<{
      token: string;
      user: AuthUser;
      organizations: Array<{ organization_id: string; role: string }>;
    }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
      { auth: false },
    );
    persistSession({
      token: data.token,
      user: {
        ...data.user,
        organizationId: data.organizations[0]?.organization_id,
        role: data.organizations[0]?.role,
      },
      organizationId: data.organizations[0]?.organization_id,
    });
    return data;
  },

  me: () =>
    request<{ user: AuthUser }>("/auth/me"),

  logout: () => {
    clearSession();
  },

  submitLead: (payload: LeadInput) =>
    request<{ ok: boolean; id: string }>(
      "/v1/public/leads",
      { method: "POST", body: JSON.stringify(payload) },
      { auth: false },
    ),

  listBlog: (lang = "fr") =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/public/blog?lang=${encodeURIComponent(lang)}`,
      {},
      { auth: false },
    ),

  getBlogPost: (slug: string) =>
    request<{ post: Record<string, unknown> }>(
      `/v1/public/blog/${encodeURIComponent(slug)}`,
      {},
      { auth: false },
    ),

  listPublicEmissionFactors: () =>
    request<{
      pack: string;
      total: number;
      items: Array<Record<string, unknown>>;
    }>("/v1/public/emission-factors", {}, { auth: false }),

  calculateFreeBilan: (answers: Record<string, string>, lead?: LeadInput extends never ? never : {
    email?: string;
    companyName?: string;
    fullName?: string;
  }) =>
    request<{
      factorPack: string;
      engineVersion: string;
      totals: { scope1: number; scope2: number; scope3: number; total: number };
      categories: Array<{ key: string; value: number; scope: number }>;
      resultHash: string;
      commentary: { resultats: string; methode: string; limites: string };
      disclaimer: string;
    }>(
      "/v1/public/free-bilan/calculate",
      {
        method: "POST",
        body: JSON.stringify({ answers, lead }),
      },
      { auth: false },
    ),

  calculate: (payload: unknown) =>
    request("/v1/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createEvidence: (payload: unknown) =>
    request<{ evidence: Record<string, unknown> }>("/v1/evidence", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listEvidence: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/evidence"),

  validateEvidence: (id: string, status: "validated" | "rejected" | "submitted", note?: string) =>
    request<{ evidence: Record<string, unknown> }>(`/v1/evidence/${id}/validate`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }),

  listFactors: () =>
    request<{ items: Array<Record<string, unknown>>; total: number }>("/v1/factors"),

  listRuns: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/runs"),

  getRun: (runId: string) =>
    request<{ run: Record<string, unknown>; lines: Array<Record<string, unknown>> }>(
      `/v1/runs/${runId}`,
    ),

  publishRun: (runId: string, supersedePrevious = true) =>
    request(`/v1/runs/${runId}/publish`, {
      method: "POST",
      body: JSON.stringify({ supersedePrevious }),
    }),

  getLedgerProvenance: (lineId: string) =>
    request<{
      lineId: string;
      runId: string;
      scope: number;
      lineKey: string;
      proofId: string;
      sixQuestions: {
        quelleDonnee: Record<string, unknown>;
        quelleSource: Record<string, unknown>;
        quelFacteur: Record<string, unknown>;
        quelleFormule: Record<string, unknown>;
        quelleVersion: Record<string, unknown>;
        quiAValide: Record<string, unknown>;
      };
    }>(`/v1/ledger/${lineId}/provenance`),

  reportFromRun: (runId: string, title: string) =>
    request("/v1/reports/from-run", {
      method: "POST",
      body: JSON.stringify({ runId, title }),
    }),

  listFunctions: () => request("/v1/functions"),
};

/**
 * Compat: tout accès `supabase.*` échoue clairement.
 * Les pages publiques doivent importer `api`.
 */
export const supabase = new Proxy(
  {},
  {
    get(_t, prop) {
      throw new Error(
        `[Newcarboscan-2027] supabase.${String(prop)} retiré. Utilisez api depuis @/integrations/api/client.`,
      );
    },
  },
);

export default api;
