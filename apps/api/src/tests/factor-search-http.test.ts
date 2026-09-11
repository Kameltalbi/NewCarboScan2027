import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { searchFactors } from "../services/factorSearch.js";

const DATABASE_URL = process.env.DATABASE_URL;

type AuthFixtures = {
  orgId: string;
  memberUserId: string;
  memberEmail: string;
  superadminUserId: string;
  superadminEmail: string;
  ademeFactorId: string;
};

async function loadAuthFixtures(pool: pg.Pool): Promise<AuthFixtures | null> {
  const sa = await pool.query<{ user_id: string; email: string }>(
    `SELECT ur.user_id, u.email
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     WHERE ur.role = 'superadmin'
     LIMIT 1`,
  );
  const member = await pool.query<{ user_id: string; email: string; organization_id: string }>(
    `SELECT om.user_id, u.email, om.organization_id
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM user_roles ur
       WHERE ur.user_id = om.user_id AND ur.role = 'superadmin'
     )
     LIMIT 1`,
  );
  if (!sa.rows[0] || !member.rows[0]) return null;

  const draftList = await searchFactors(pool, {
    status: "approved",
    q: "15319",
    limit: 1,
  });
  if (!draftList.items[0]) return null;

  return {
    orgId: member.rows[0].organization_id,
    memberUserId: member.rows[0].user_id,
    memberEmail: member.rows[0].email,
    superadminUserId: sa.rows[0].user_id,
    superadminEmail: sa.rows[0].email,
    ademeFactorId: draftList.items[0].id,
  };
}

describe("factor search HTTP auth", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>> | undefined;
  let fixtures: AuthFixtures | null = null;
  let pool: pg.Pool | undefined;

  after(async () => {
    if (app) await app.close();
    if (pool) await pool.end();
  });

  it("skips when DATABASE_URL unset", () => {
    if (!DATABASE_URL) assert.ok(true);
  });

  it("enforces draft catalog auth over HTTP", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }

    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    fixtures = await loadAuthFixtures(pool);
    if (!fixtures) {
      t.skip("need superadmin, org member, and draft factor fixtures");
      return;
    }

    app = await buildTestApp();

    const memberToken = signToken({
      id: fixtures.memberUserId,
      email: fixtures.memberEmail,
      organizationId: fixtures.orgId,
      role: "member",
    });
    const adminToken = signToken({
      id: fixtures.superadminUserId,
      email: fixtures.superadminEmail,
      organizationId: fixtures.orgId,
      role: "superadmin",
    });
    const orgHeader = { "x-organization-id": fixtures.orgId };

    const memberDraftSearch = await app.inject({
      method: "GET",
      url: "/v1/factors/search?status=draft&q=gaz&limit=5",
      headers: { authorization: `Bearer ${memberToken}`, ...orgHeader },
    });
    assert.equal(memberDraftSearch.statusCode, 403);

    const memberDraftFacets = await app.inject({
      method: "GET",
      url: "/v1/factors/facets?status=draft",
      headers: { authorization: `Bearer ${memberToken}`, ...orgHeader },
    });
    assert.equal(memberDraftFacets.statusCode, 403);

    const memberAdemeDetail = await app.inject({
      method: "GET",
      url: `/v1/factors/${fixtures.ademeFactorId}`,
      headers: { authorization: `Bearer ${memberToken}`, ...orgHeader },
    });
    assert.equal(memberAdemeDetail.statusCode, 200);

    const adminCatalogSearch = await app.inject({
      method: "GET",
      url: "/v1/factors/search?status=approved&q=gaz&limit=5",
      headers: { authorization: `Bearer ${adminToken}`, ...orgHeader },
    });
    assert.equal(adminCatalogSearch.statusCode, 200);
    const adminSearchBody = adminCatalogSearch.json() as { items: unknown[] };
    assert.ok(adminSearchBody.items.length >= 1);

    const adminCatalogFacets = await app.inject({
      method: "GET",
      url: "/v1/factors/facets?status=approved",
      headers: { authorization: `Bearer ${adminToken}`, ...orgHeader },
    });
    assert.equal(adminCatalogFacets.statusCode, 200);
    const adminFacetsBody = adminCatalogFacets.json() as {
      sources: Array<{ value: string; count: number }>;
    };
    assert.ok(adminFacetsBody.sources.some((s) => s.value === "ademe"));

    const adminAdemeDetail = await app.inject({
      method: "GET",
      url: `/v1/factors/${fixtures.ademeFactorId}`,
      headers: { authorization: `Bearer ${adminToken}`, ...orgHeader },
    });
    assert.equal(adminAdemeDetail.statusCode, 200);
  });
});
