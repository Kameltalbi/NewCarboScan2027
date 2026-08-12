import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function registerFactorRoutes(app: FastifyInstance) {
  app.get(
    "/v1/factors",
    { preHandler: [app.requireOrgMember] },
    async () => {
      const { rows } = await pool.query(
        `SELECT
           f.id,
           f.stable_factor_id,
           f.version_number,
           f.name,
           f.category,
           f.geography,
           f.unit_numerator,
           f.unit_denominator,
           f.value::text AS value,
           f.uncertainty_pct::text AS uncertainty_pct,
           f.selection_rule,
           f.checksum,
           f.status,
           v.id AS version_id,
           v.version_label,
           v.gwp_set,
           v.source_dataset,
           s.name AS source_name,
           s.license AS source_license
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE f.status = 'approved' AND v.status = 'approved'
         ORDER BY f.category, f.name`,
      );
      return { items: rows, total: rows.length };
    },
  );
}
