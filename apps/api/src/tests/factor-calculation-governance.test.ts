import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import {
  REGISTRY_FACTOR_OVERRIDE_ERROR,
  UNAVAILABLE_EMISSION_FACTOR_ERROR,
} from "../routes/calculate.js";
import { getFactorById, searchFactors } from "../services/factorSearch.js";

const DATABASE_URL = process.env.DATABASE_URL;

const ADEME_FACTOR_ID = "71daca92-31e7-4188-b124-f8e26f8f84a1";

const RESOLVABLE_FACTOR_SQL = `
  SELECT f.id, f.value::text AS value,
         (f.unit_numerator || '/' || f.unit_denominator) AS unit,
         f.checksum, f.version_id,
         f.stable_factor_id, f.external_code,
         v.dataset_version, s.source_key
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE f.id = $1
    AND f.status = 'approved'
    AND v.status = 'approved'
    AND v.calculation_status = 'enabled'
`;

type AuthCtx = {
  token: string;
  orgId: string;
  userId: string;
};

async function loadAuth(pool: pg.Pool): Promise<AuthCtx | null> {
  const member = await pool.query<{
    user_id: string;
    email: string;
    organization_id: string;
  }>(
    `SELECT om.user_id, u.email, om.organization_id
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     LIMIT 1`,
  );
  if (!member.rows[0]) return null;
  const { user_id, email, organization_id } = member.rows[0];
  return {
    userId: user_id,
    orgId: organization_id,
    token: signToken({
      id: user_id,
      email,
      organizationId: organization_id,
      role: "member",
    }),
  };
}

async function postCalculate(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  auth: AuthCtx,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: "POST",
    url: "/v1/calculate",
    headers: {
      authorization: `Bearer ${auth.token}`,
      "x-organization-id": auth.orgId,
      "content-type": "application/json",
    },
    payload,
  });
}

async function getCoreTnFactor(
  pool: pg.Pool,
  stableFactorId: string,
): Promise<{ id: string; value: string; unit: string; checksum: string; version_id: string; stable_factor_id: string; source_key: string; dataset_version: string } | null> {
  const { rows } = await pool.query(
    `SELECT f.id, f.value::text AS value,
            (f.unit_numerator || '/' || f.unit_denominator) AS unit,
            f.checksum, f.version_id, f.stable_factor_id,
            v.dataset_version, s.source_key
     FROM emission_factors f
     JOIN emission_factor_versions v ON v.id = f.version_id
     JOIN factor_sources s ON s.id = v.source_id
     WHERE s.source_key = 'internal' AND f.stable_factor_id = $1
     LIMIT 1`,
    [stableFactorId],
  );
  return rows[0] ?? null;
}

describe("factor calculation governance 019C", () => {
  it("skips when DATABASE_URL unset", () => {
    if (!DATABASE_URL) assert.ok(true);
  });

  it("A+J+ledger: Core TN calculable, numeric result and ledger provenance", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const auth = await loadAuth(pool);
    if (!auth) {
      t.skip("need org member");
      return;
    }
    const tn = await getCoreTnFactor(pool, "electricity_kwh");
    if (!tn) {
      t.skip("electricity_kwh not found");
      return;
    }

    const activityQuantity = "10";
    const expectedResult = String(Number(activityQuantity) * Number(tn.value));

    const app = await buildTestApp();
    try {
      const res = await postCalculate(app, auth, {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "019c-tn-baseline",
            scope: 2,
            factorId: tn.id,
            activityQuantity,
            activityUnit: "kWh",
          },
        ],
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as {
        runId: string;
        lines: Array<{ factorValue: string; factorUnit: string; resultKgCo2e: string }>;
      };
      assert.equal(body.lines[0].factorValue, tn.value);
      assert.equal(body.lines[0].factorUnit, tn.unit);
      assert.equal(Number(body.lines[0].resultKgCo2e), Number(expectedResult));

      const ledger = await pool.query<{
        factor_id: string;
        factor_version_id: string;
        factor_checksum: string;
        factor_value: string;
        factor_unit: string;
        provenance: Record<string, unknown>;
      }>(
        `SELECT factor_id, factor_version_id, factor_checksum,
                factor_value::text, factor_unit, provenance
         FROM calculation_ledger
         WHERE run_id = $1`,
        [body.runId],
      );
      assert.equal(ledger.rows.length, 1);
      const row = ledger.rows[0];
      assert.equal(row.factor_id, tn.id);
      assert.equal(row.factor_version_id, tn.version_id);
      assert.equal(row.factor_checksum, tn.checksum);
      assert.equal(row.factor_value, tn.value);
      assert.equal(row.factor_unit, tn.unit);
      assert.equal(row.provenance.factorResolvedFromDb, true);
      assert.equal(row.provenance.stableFactorId, tn.stable_factor_id);
      assert.equal(row.provenance.sourceKey, tn.source_key);
      assert.equal(row.provenance.datasetVersion, tn.dataset_version);
      assert.equal(row.provenance.clientOverride, false);
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it("B: ADEME draft + calculation disabled → refus", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const auth = await loadAuth(pool);
    if (!auth) {
      t.skip("need org member");
      return;
    }
    const app = await buildTestApp();
    try {
      const res = await postCalculate(app, auth, {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "ademe-blocked",
            scope: 1,
            factorId: ADEME_FACTOR_ID,
            activityQuantity: "100",
            activityUnit: "Nm3",
          },
        ],
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it("C: version draft + calculation enabled → refus (resolution SQL)", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const client = await pool.connect();
    try {
      const tn = await getCoreTnFactor(pool, "gas_m3");
      if (!tn) {
        t.skip("gas_m3 not found");
        return;
      }
      await client.query("BEGIN");
      await client.query(
        `UPDATE emission_factor_versions
         SET status = 'draft', calculation_status = 'enabled'
         WHERE version_label = 'core-tn-2027.1'`,
      );
      const { rows } = await client.query(RESOLVABLE_FACTOR_SQL, [tn.id]);
      assert.equal(rows.length, 0);
      await client.query("ROLLBACK");
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("D: version approved + calculation disabled → refus HTTP", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const auth = await loadAuth(pool);
    const tn = await getCoreTnFactor(pool, "gas_m3");
    if (!auth || !tn) {
      t.skip("fixtures missing");
      return;
    }
    const app = await buildTestApp();
    try {
      await pool.query(
        `UPDATE emission_factor_versions SET calculation_status = 'disabled'
         WHERE version_label = 'core-tn-2027.1'`,
      );
      const res = await postCalculate(app, auth, {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "calc-disabled",
            scope: 1,
            factorId: tn.id,
            activityQuantity: "1",
            activityUnit: "m3",
          },
        ],
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);
    } finally {
      await pool.query(
        `UPDATE emission_factor_versions SET calculation_status = 'enabled'
         WHERE version_label = 'core-tn-2027.1'`,
      );
      await app.close();
      await pool.end();
    }
  });

  it("E: factor deprecated → refus HTTP", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const auth = await loadAuth(pool);
    const tn = await getCoreTnFactor(pool, "gas_m3");
    if (!auth || !tn) {
      t.skip("fixtures missing");
      return;
    }
    const app = await buildTestApp();
    try {
      await pool.query(
        `UPDATE emission_factors SET status = 'deprecated' WHERE id = $1`,
        [tn.id],
      );
      const res = await postCalculate(app, auth, {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "deprecated",
            scope: 1,
            factorId: tn.id,
            activityQuantity: "1",
            activityUnit: "m3",
          },
        ],
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);
    } finally {
      await pool.query(
        `UPDATE emission_factors SET status = 'approved' WHERE id = $1`,
        [tn.id],
      );
      await app.close();
      await pool.end();
    }
  });

  it("F: catalog hidden + calculation enabled → still resolvable (SQL, no ledger)", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const client = await pool.connect();
    try {
      const tn = await getCoreTnFactor(pool, "heat_kwh");
      if (!tn) {
        t.skip("heat_kwh not found");
        return;
      }
      await client.query("BEGIN");
      await client.query(
        `UPDATE emission_factor_versions SET catalog_status = 'hidden'
         WHERE version_label = 'core-tn-2027.1'`,
      );
      const { rows } = await client.query(RESOLVABLE_FACTOR_SQL, [tn.id]);
      assert.equal(rows.length, 1);
      await client.query("ROLLBACK");
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("G/H/I: registry override factorValue/factorUnit → 400", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const auth = await loadAuth(pool);
    const tn = await getCoreTnFactor(pool, "fuel_liters");
    if (!auth || !tn) {
      t.skip("fixtures missing");
      return;
    }
    const app = await buildTestApp();
    try {
      for (const payload of [
        { factorValue: "999.99" },
        { factorUnit: "kgCO2e/kWh" },
        { factorValue: "999.99", factorUnit: "kgCO2e/kWh" },
      ]) {
        const res = await postCalculate(app, auth, {
          method: "bilan_carbone",
          lines: [
            {
              lineKey: "override",
              scope: 1,
              factorId: tn.id,
              activityQuantity: "1",
              activityUnit: "L",
              ...payload,
            },
          ],
        });
        assert.equal(res.statusCode, 400, JSON.stringify(payload));
        assert.equal(res.json().error, REGISTRY_FACTOR_OVERRIDE_ERROR);
      }
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it("detail governance includes calculationStatus", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const tn = await getCoreTnFactor(pool, "electricity_kwh");
      if (!tn) {
        t.skip("electricity_kwh not found");
        return;
      }
      const detail = await getFactorById(pool, tn.id, false);
      assert.ok(detail);
      assert.equal(detail!.governance.calculationStatus, "enabled");
    } finally {
      await pool.end();
    }
  });

  it("019B active: ADEME visible in catalog but calculate refused", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const auth = await loadAuth(pool);
    if (!auth) {
      t.skip("need org member");
      return;
    }
    const app = await buildTestApp();
    try {
      const search = await searchFactors(pool, { status: "approved", q: "15319", limit: 5 });
      assert.ok(search.items.some((i) => i.externalCode === "15319"));

      const detail = await getFactorById(pool, ADEME_FACTOR_ID, false);
      assert.ok(detail);
      assert.equal(detail!.governance.catalogStatus, "visible");
      assert.equal(detail!.governance.calculationStatus, "disabled");

      const calc = await postCalculate(app, auth, {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "ademe-019b-active",
            scope: 1,
            factorId: ADEME_FACTOR_ID,
            activityQuantity: "1",
            activityUnit: "Nm3",
          },
        ],
      });
      assert.equal(calc.statusCode, 400);
      assert.equal(calc.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);

      const legacy = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal'`,
      );
      assert.equal(Number(legacy.rows[0].n), 8);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
