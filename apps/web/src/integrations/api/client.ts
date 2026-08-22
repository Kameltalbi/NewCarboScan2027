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
  platformRole?: string;
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

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  sector: string | null;
  country: string | null;
  status: "active" | "suspended";
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  memberCount: number;
  owner: { id: string; email: string | null; fullName: string | null } | null;
};

export type MyOrganization = {
  organization_id: string;
  role: string;
  name?: string;
  sector?: string | null;
  country?: string | null;
  status?: string;
};

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
      organizations: MyOrganization[];
    }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      { auth: false },
    );
    persistSession({
      token: data.token,
      user: {
        ...data.user,
        organizationId: data.user.organizationId ?? data.organizations[0]?.organization_id,
        role: data.user.role ?? data.organizations[0]?.role,
      },
      organizationId: data.user.organizationId ?? data.organizations[0]?.organization_id,
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
    request<{ user: AuthUser; organizations: MyOrganization[] }>("/auth/me"),

  logout: () => {
    clearSession();
  },

  submitLead: (payload: LeadInput) =>
    request<{ ok: boolean; id: string }>(
      "/v1/public/leads",
      { method: "POST", body: JSON.stringify(payload) },
      { auth: false },
    ),

  lookupPromoCode: (code: string) =>
    request<{
      promo: {
        id: string;
        code: string;
        discount_type: "percent" | "fixed";
        discount_value: number;
        minimum_amount: number;
        max_uses: number | null;
        current_uses: number;
        valid_until: string | null;
        is_active: boolean;
      };
    }>(`/v1/public/promo-codes/${encodeURIComponent(code)}`, {}, { auth: false }),

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

  adminListOrganizations: () =>
    request<{ items: AdminOrganization[] }>("/v1/admin/organizations"),

  adminSuspendOrganization: (id: string, reason?: string) =>
    request<{ organization: { id: string; name: string; status: string } }>(
      `/v1/admin/organizations/${id}/suspend`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),

  adminActivateOrganization: (id: string) =>
    request<{ organization: { id: string; name: string; status: string } }>(
      `/v1/admin/organizations/${id}/activate`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  adminDeleteOrganization: (id: string, confirmName: string) =>
    request<{ ok: boolean; id: string; name: string }>(
      `/v1/admin/organizations/${id}`,
      {
        method: "DELETE",
        body: JSON.stringify({ confirmName }),
      },
    ),

  adminListUsers: () =>
    request<{
      items: Array<{
        id: string;
        email: string;
        fullName: string | null;
        role: string;
        status: "active" | "blocked";
        organizationName: string | null;
        subscriptionPlan: string | null;
        createdAt: string;
        lastSignInAt: string | null;
      }>;
    }>("/v1/admin/users"),

  adminPatchUser: (
    id: string,
    payload: { isActive?: boolean; role?: "user" | "admin" | "superadmin" | "financeur" },
  ) =>
    request<{ ok: boolean; id: string }>(`/v1/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminSetUserPassword: (id: string, password: string) =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  adminDeleteUser: (id: string) =>
    request<{ ok: boolean; id: string }>(`/v1/admin/users/${id}`, {
      method: "DELETE",
    }),

  getOrganization: () =>
    request<{ organization: OrganizationData | null }>("/v1/org"),

  patchOrganization: (payload: Record<string, unknown>) =>
    request<{ organization: OrganizationData }>("/v1/org", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  listOrgModules: () =>
    request<{
      items: Array<{
        module_id: string;
        slug: string;
        name: string;
        description: string | null;
        icon: string | null;
        route: string | null;
        category: string | null;
        started_at: string | null;
        expires_at: string | null;
      }>;
    }>("/v1/org/modules"),

  listOrgMembers: () =>
    request<{
      items: Array<{
        user_id: string;
        role: string;
        created_at: string;
        email: string;
        full_name: string | null;
        is_active: boolean;
        phone: string | null;
      }>;
    }>("/v1/org/members"),

  patchOrgMember: (userId: string, role: string) =>
    request<{ ok: boolean }>(`/v1/org/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeOrgMember: (userId: string) =>
    request<{ ok: boolean }>(`/v1/org/members/${userId}`, { method: "DELETE" }),

  inviteOrgMember: (payload: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    role?: string;
  }) =>
    request<{ member: { user_id: string; email: string; role: string; created: boolean } }>(
      "/v1/org/members",
      { method: "POST", body: JSON.stringify(payload) },
    ),

  listMemberPermissions: (userId: string) =>
    request<{
      items: Array<{ id: string; permission_key: string; granted: boolean; allowed: boolean }>;
    }>(`/v1/org/members/${userId}/permissions`),

  setMemberPermission: (
    userId: string,
    permissionKey: string,
    allowed: boolean | null,
  ) =>
    request(`/v1/org/members/${userId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionKey, allowed }),
    }),

  listApiKeys: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/org/api-keys"),

  createApiKey: (payload: {
    name?: string;
    appName?: string;
    scopes?: string[];
    env?: "live" | "test";
  }) =>
    request<{ item: Record<string, unknown>; key: string }>("/v1/org/api-keys", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  revokeApiKey: (id: string) =>
    request(`/v1/org/api-keys/${id}`, { method: "DELETE" }),

  listApiLogs: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/org/api-logs"),

  listEntities: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/org/entities"),

  createEntity: (payload: Record<string, unknown>) =>
    request("/v1/org/entities", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  patchEntity: (id: string, payload: Record<string, unknown>) =>
    request(`/v1/org/entities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteEntity: (id: string) =>
    request(`/v1/org/entities/${id}`, { method: "DELETE" }),

  listSites: (companyId?: string) => {
    const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
    return request<{ items: Array<Record<string, unknown>> }>(`/v1/org/sites${q}`);
  },

  createSite: (payload: Record<string, unknown>) =>
    request<{ site: Record<string, unknown> }>("/v1/org/sites", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  patchSite: (id: string, payload: Record<string, unknown>) =>
    request<{ site: Record<string, unknown> }>(`/v1/org/sites/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteSite: (id: string) =>
    request(`/v1/org/sites/${id}`, { method: "DELETE" }),

  listOrgYears: () =>
    request<{
      items: Array<{ id: string; year: number; is_included: boolean; created_at: string }>;
      referenceYear: number | null;
      latestActivityYear: number | null;
      latestBilanYear: number | null;
    }>("/v1/org/years"),

  getSubscription: () =>
    request<{
      hasActiveSubscription: boolean;
      plan: string | null;
      status: string | null;
      orders: Array<Record<string, unknown>>;
    }>("/v1/org/subscription"),

  getProfile: () =>
    request<{ profile: Record<string, unknown> | null }>("/v1/me/profile"),

  createOrganization: (payload: { name: string; sector?: string | null }) =>
    request<{ organization: { id: string; name: string; slug: string } }>("/v1/orgs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteMyOrganization: (id: string) =>
    request(`/v1/orgs/${id}`, { method: "DELETE" }),

  patchProfile: (payload: Record<string, unknown>) =>
    request("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request("/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  adminListModules: () =>
    request<{
      items: Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        icon: string | null;
        route: string | null;
        category: string | null;
        is_active: boolean;
      }>;
    }>("/v1/admin/modules"),

  adminListOrgModules: (organizationId: string) =>
    request<{
      items: Array<{
        module_id: string;
        slug: string;
        name: string;
        description: string | null;
        icon: string | null;
        enabled: boolean;
      }>;
    }>(`/v1/admin/organizations/${organizationId}/modules`),

  adminToggleOrgModule: (organizationId: string, slug: string, enabled: boolean) =>
    request(`/v1/admin/organizations/${organizationId}/modules`, {
      method: "PUT",
      body: JSON.stringify({ slug, enabled }),
    }),

  adminListOrgYears: (organizationId: string) =>
    request<{ items: Array<{ id: string; year: number; is_included: boolean; created_at: string }> }>(
      `/v1/admin/organizations/${organizationId}/years`,
    ),

  adminAddOrgYear: (organizationId: string, year: number, isIncluded = true) =>
    request(`/v1/admin/organizations/${organizationId}/years`, {
      method: "POST",
      body: JSON.stringify({ year, isIncluded }),
    }),

  adminPatchOrgYear: (organizationId: string, yearId: string, isIncluded: boolean) =>
    request(`/v1/admin/organizations/${organizationId}/years/${yearId}`, {
      method: "PATCH",
      body: JSON.stringify({ isIncluded }),
    }),

  adminDeleteOrgYear: (organizationId: string, yearId: string) =>
    request(`/v1/admin/organizations/${organizationId}/years/${yearId}`, {
      method: "DELETE",
    }),

  adminListQuota: (organizationId: string) =>
    request<{ items: Array<{ id: string; year: number; tokens_total: number; tokens_used: number }> }>(
      `/v1/admin/organizations/${organizationId}/quota`,
    ),

  adminPatchQuota: (
    organizationId: string,
    payload: { year: number; tokensTotal?: number; tokensUsed?: number; addTokens?: number; resetUsed?: boolean },
  ) =>
    request(`/v1/admin/organizations/${organizationId}/quota`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminSetOrgPlan: (organizationId: string, planCode: string, status?: "active" | "suspended" | "cancelled") =>
    request(`/v1/admin/organizations/${organizationId}/plan`, {
      method: "PUT",
      body: JSON.stringify({ planCode, status }),
    }),

  adminListOrders: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/admin/orders"),

  adminPatchOrder: (id: string, payload: Record<string, unknown>) =>
    request(`/v1/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminDeleteOrder: (id: string) =>
    request(`/v1/admin/orders/${id}`, { method: "DELETE" }),

  adminListBlog: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/admin/blog"),

  adminCreateBlog: (payload: Record<string, unknown>) =>
    request("/v1/admin/blog", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminPatchBlog: (id: string, payload: Record<string, unknown>) =>
    request(`/v1/admin/blog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminDeleteBlog: (id: string) =>
    request(`/v1/admin/blog/${id}`, { method: "DELETE" }),

  adminListPromoCodes: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/admin/promo-codes"),

  adminCreatePromoCode: (payload: Record<string, unknown>) =>
    request("/v1/admin/promo-codes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminPatchPromoCode: (id: string, payload: Record<string, unknown>) =>
    request(`/v1/admin/promo-codes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminDeletePromoCode: (id: string) =>
    request(`/v1/admin/promo-codes/${id}`, { method: "DELETE" }),

  adminCreateOrganization: (payload: {
    name: string;
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    sector?: string;
    plan?: string;
  }) =>
    request("/v1/admin/organizations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listActivityData: (filters: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    if (filters.siteId) q.set("siteId", filters.siteId);
    if (filters.category) q.set("category", filters.category);
    if (filters.activityType) q.set("activityType", filters.activityType);
    if (filters.periodStart) q.set("periodStart", filters.periodStart);
    if (filters.periodEnd) q.set("periodEnd", filters.periodEnd);
    if (filters.scopeHint) q.set("scopeHint", filters.scopeHint);
    const qs = q.toString();
    return request<{ items: Array<Record<string, unknown>> }>(
      `/v1/collect/activity-data${qs ? `?${qs}` : ""}`,
    );
  },

  getActivityData: (id: string) =>
    request<{ item: Record<string, unknown> }>(`/v1/collect/activity-data/${id}`),

  createActivityData: (payload: Record<string, unknown> | Record<string, unknown>[]) =>
    request<{ items: Array<Record<string, unknown>>; item: Record<string, unknown> }>(
      "/v1/collect/activity-data",
      { method: "POST", body: JSON.stringify(payload) },
    ),

  patchActivityData: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/collect/activity-data/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteActivityData: (id: string) =>
    request(`/v1/collect/activity-data/${id}`, { method: "DELETE" }),

  getActivityQualityStats: () =>
    request<{ stats: Record<string, number> }>("/v1/collect/quality-stats"),

  listBilans: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/bilans"),

  getBilan: (id: string) =>
    request<{ bilan: Record<string, unknown> }>(`/v1/bilans/${id}`),

  createBilan: (payload: Record<string, unknown>) =>
    request<{ bilan: Record<string, unknown> }>("/v1/bilans", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  patchBilan: (id: string, payload: Record<string, unknown>) =>
    request<{ bilan: Record<string, unknown> }>(`/v1/bilans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteBilan: (id: string) =>
    request(`/v1/bilans/${id}`, { method: "DELETE" }),

  listCollectComments: (filters: { sessionId?: string; targetKey?: string } = {}) => {
    const q = new URLSearchParams();
    if (filters.sessionId) q.set("sessionId", filters.sessionId);
    if (filters.targetKey) q.set("targetKey", filters.targetKey);
    const qs = q.toString();
    return request<{ items: Array<Record<string, unknown>> }>(
      `/v1/collect/comments${qs ? `?${qs}` : ""}`,
    );
  },

  createCollectComment: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/collect/comments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  patchCollectComment: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/collect/comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteCollectComment: (id: string) =>
    request(`/v1/collect/comments/${id}`, { method: "DELETE" }),

  listCbamInstallations: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/cbam/installations"),
  createCbamInstallation: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/cbam/installations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchCbamInstallation: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/cbam/installations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCbamInstallation: (id: string) =>
    request(`/v1/cbam/installations/${id}`, { method: "DELETE" }),
  listCbamProducts: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/cbam/products"),
  listCbamProduction: (installationId?: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/cbam/production${installationId ? `?installationId=${installationId}` : ""}`,
    ),
  upsertCbamProduction: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/cbam/production", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  listCbamExports: (installationId?: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/cbam/exports${installationId ? `?installationId=${installationId}` : ""}`,
    ),
  createCbamExport: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/cbam/exports", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listCbamEnergy: (installationId?: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/cbam/energy${installationId ? `?installationId=${installationId}` : ""}`,
    ),
  listCbamEmissionsSummary: (installationId?: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/cbam/emissions-summary${installationId ? `?installationId=${installationId}` : ""}`,
    ),

  listAcvProjects: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/acv/projects"),
  createAcvProject: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/acv/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchAcvProject: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/acv/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAcvProject: (id: string) =>
    request(`/v1/acv/projects/${id}`, { method: "DELETE" }),
  listAcvInventory: (projectId: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/acv/inventory?projectId=${encodeURIComponent(projectId)}`,
    ),
  createAcvInventory: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/acv/inventory", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchAcvInventory: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/acv/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAcvInventory: (id: string) =>
    request(`/v1/acv/inventory/${id}`, { method: "DELETE" }),
  getAcvInventorySettings: (projectId: string) =>
    request<{ item: Record<string, unknown> | null }>(
      `/v1/acv/inventory-settings?projectId=${encodeURIComponent(projectId)}`,
    ),
  putAcvInventorySettings: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/acv/inventory-settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  listAcvMaterials: (category?: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/acv/materials${category ? `?category=${encodeURIComponent(category)}` : ""}`,
    ),
  listAcvProcesses: (sector?: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/acv/processes${sector ? `?sector=${encodeURIComponent(sector)}` : ""}`,
    ),
  listAcvTransportModes: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/acv/transport-modes"),

  listClimateRoadmaps: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/climate/roadmaps"),
  getClimateRoadmap: (id: string) =>
    request<{ item: Record<string, unknown> }>(`/v1/climate/roadmaps/${id}`),
  createClimateRoadmap: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/climate/roadmaps", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchClimateRoadmap: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/climate/roadmaps/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  listClimateLevers: (roadmapId: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/climate/levers?roadmapId=${encodeURIComponent(roadmapId)}`,
    ),
  createClimateLever: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/climate/levers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchClimateLever: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/climate/levers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteClimateLever: (id: string) =>
    request(`/v1/climate/levers/${id}`, { method: "DELETE" }),
  listClimateActions: (filters: {
    roadmapId: string;
    leverId?: string;
    status?: string;
    priority?: string;
  }) => {
    const q = new URLSearchParams({ roadmapId: filters.roadmapId });
    if (filters.leverId) q.set("leverId", filters.leverId);
    if (filters.status) q.set("status", filters.status);
    if (filters.priority) q.set("priority", filters.priority);
    return request<{ items: Array<Record<string, unknown>> }>(
      `/v1/climate/actions?${q.toString()}`,
    );
  },
  createClimateAction: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/climate/actions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchClimateAction: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/climate/actions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteClimateAction: (id: string) =>
    request(`/v1/climate/actions/${id}`, { method: "DELETE" }),

  listPcfStudies: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/pcf/studies"),
  getPcfStudy: (id: string) =>
    request<{ item: Record<string, unknown> }>(`/v1/pcf/studies/${id}`),
  createPcfStudy: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/pcf/studies", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchPcfStudy: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/pcf/studies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deletePcfStudy: (id: string) =>
    request(`/v1/pcf/studies/${id}`, { method: "DELETE" }),
  listPcfVersions: (studyId: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/pcf/studies/${studyId}/versions`,
    ),
  createPcfVersion: (payload: {
    studyId: string;
    snapshot?: Record<string, unknown>;
    comment?: string;
  }) =>
    request<{ item: Record<string, unknown> }>("/v1/pcf/versions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listOrders: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/org/orders"),
  createOrder: (payload: Record<string, unknown>) =>
    request<{ order: Record<string, unknown> }>("/v1/org/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createRecommendedAction: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/org/recommended-actions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listClimateScenarios: () =>
    request<{ items: Array<Record<string, unknown>> }>("/v1/climate/scenarios"),
  createClimateScenario: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/climate/scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchClimateScenario: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(`/v1/climate/scenarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteClimateScenario: (id: string) =>
    request(`/v1/climate/scenarios/${id}`, { method: "DELETE" }),
  listClimateScenarioLevers: (scenarioId: string) =>
    request<{ items: Array<Record<string, unknown>> }>(
      `/v1/climate/scenario-levers?scenarioId=${encodeURIComponent(scenarioId)}`,
    ),
  createClimateScenarioLever: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>("/v1/climate/scenario-levers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchClimateScenarioLever: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(
      `/v1/climate/scenario-levers/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),
  deleteClimateScenarioLever: (id: string) =>
    request(`/v1/climate/scenario-levers/${id}`, { method: "DELETE" }),
  listClimateScenarioAssumptions: (leverId?: string) => {
    const q = leverId ? `?leverId=${encodeURIComponent(leverId)}` : "";
    return request<{ items: Array<Record<string, unknown>> }>(
      `/v1/climate/scenario-assumptions${q}`,
    );
  },
  createClimateScenarioAssumption: (payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(
      "/v1/climate/scenario-assumptions",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  patchClimateScenarioAssumption: (id: string, payload: Record<string, unknown>) =>
    request<{ item: Record<string, unknown> }>(
      `/v1/climate/scenario-assumptions/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),

  invokeFunction: (name: string, body?: unknown) =>
    request<Record<string, unknown>>(`/v1/functions/${name}`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
};

export type OrganizationData = {
  id: string;
  name: string;
  slug?: string;
  sector: string | null;
  country: string | null;
  status?: string;
  referenceYear: number | null;
  currency: string | null;
  energyUnit: string | null;
  massUnit: string | null;
  distanceUnit: string | null;
  logoUrl: string | null;
  pilotName: string | null;
  legalName: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  userId?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  annualRevenue?: number | null;
  employees?: number | null;
  totalSurface?: number | null;
};

/** Compat session — remplace supabase.auth sans restaurer de gateway table. */
export const sessionAuth = {
  async getUser() {
    const user = getStoredUser();
    return { data: { user }, error: null as Error | null };
  },
  async getSession() {
    const user = getStoredUser();
    const token = getStoredToken();
    if (!user || !token) {
      return { data: { session: null }, error: null as Error | null };
    }
    return {
      data: { session: { user, access_token: token } },
      error: null as Error | null,
    };
  },
  async signOut() {
    clearSession();
    return { error: null as Error | null };
  },
};

/**
 * Plus d'accès supabase. Les pages doivent utiliser `api`.
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
