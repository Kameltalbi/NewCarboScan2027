/**
 * Deterministic org/user/member fixture for Resolver E2E on fresh DBs.
 * Idempotent upserts — safe to call from multiple suites.
 */
import { createHash } from "node:crypto";
import type { Pool } from "pg";

export const TEST_ORG_ID = "b1000000-0000-4000-8000-000000000001";
export const TEST_USER_ID = "b1000000-0000-4000-8000-000000000002";
export const TEST_SUPERADMIN_ID = "b1000000-0000-4000-8000-000000000003";
export const TEST_ORG_SLUG = "carboscan-e2e-fixture";
export const TEST_USER_EMAIL = "e2e-fixture@carboscan.test";
export const TEST_SUPERADMIN_EMAIL = "e2e-superadmin@carboscan.test";

/** Placeholder hash (JWT-signed tests do not verify password). */
const PLACEHOLDER_PASSWORD_HASH = createHash("sha256")
  .update("carboscan-e2e-fixture-password")
  .digest("hex");

export type TestOrgFixture = {
  organizationId: string;
  userId: string;
  email: string;
  superadminUserId: string;
  superadminEmail: string;
};

export async function ensureTestOrgFixture(pool: Pool): Promise<TestOrgFixture> {
  await pool.query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, 'CarboScan E2E Fixture', $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`,
    [TEST_ORG_ID, TEST_ORG_SLUG],
  );

  await pool.query(
    `INSERT INTO users (id, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, 'E2E Fixture User', true)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           is_active = true`,
    [TEST_USER_ID, TEST_USER_EMAIL, PLACEHOLDER_PASSWORD_HASH],
  );

  await pool.query(
    `INSERT INTO users (id, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, 'E2E Superadmin', true)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           is_active = true`,
    [TEST_SUPERADMIN_ID, TEST_SUPERADMIN_EMAIL, PLACEHOLDER_PASSWORD_HASH],
  );

  // Force fixture identities if another row stole slug/email
  await pool.query(`UPDATE organizations SET slug = $2 WHERE id = $1`, [
    TEST_ORG_ID,
    TEST_ORG_SLUG,
  ]);
  await pool.query(`UPDATE users SET email = $2 WHERE id = $1`, [
    TEST_USER_ID,
    TEST_USER_EMAIL,
  ]);
  await pool.query(`UPDATE users SET email = $2 WHERE id = $1`, [
    TEST_SUPERADMIN_ID,
    TEST_SUPERADMIN_EMAIL,
  ]);

  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner'`,
    [TEST_ORG_ID, TEST_USER_ID],
  );

  await pool.query(
    `INSERT INTO user_roles (user_id, role)
     VALUES ($1, 'superadmin')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [TEST_SUPERADMIN_ID],
  );

  return {
    organizationId: TEST_ORG_ID,
    userId: TEST_USER_ID,
    email: TEST_USER_EMAIL,
    superadminUserId: TEST_SUPERADMIN_ID,
    superadminEmail: TEST_SUPERADMIN_EMAIL,
  };
}
