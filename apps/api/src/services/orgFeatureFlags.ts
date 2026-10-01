import type { FastifyReply } from "fastify";
import { pool } from "../db.js";

export type OrganizationType = "enterprise" | "financial_institution";

export type OrgFeatureFlags = {
  organizationType: OrganizationType;
  financedEmissionsEnabled: boolean;
};

export function defaultFinancedEmissionsEnabled(
  organizationType: OrganizationType,
): boolean {
  return organizationType === "financial_institution";
}

export async function getOrgFeatureFlags(
  organizationId: string,
): Promise<OrgFeatureFlags> {
  const { rows } = await pool.query(
    `SELECT organization_type, financed_emissions_enabled
     FROM organizations
     WHERE id = $1`,
    [organizationId],
  );
  const row = rows[0];
  const organizationType =
    row?.organization_type === "financial_institution"
      ? "financial_institution"
      : "enterprise";
  return {
    organizationType,
    financedEmissionsEnabled: Boolean(row?.financed_emissions_enabled),
  };
}

/** Block PCAF / financed-emissions operations when the tenant flag is off. */
export async function assertFinancedEmissionsEnabled(
  organizationId: string,
  reply: FastifyReply,
): Promise<boolean> {
  const flags = await getOrgFeatureFlags(organizationId);
  if (!flags.financedEmissionsEnabled) {
    reply.code(403).send({
      error:
        "Module Émissions financées (PCAF) non activé pour cette organisation",
      code: "financed_emissions_disabled",
    });
    return false;
  }
  return true;
}

export function isPcafSupplierPayload(body: {
  scope3_ghg_category?: number | null;
}): boolean {
  return Number(body.scope3_ghg_category) === 15;
}
