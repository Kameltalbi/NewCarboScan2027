/**
 * Consolidation organisation → sites (ABC-11).
 * Chaque ligne entre une fois dans le total. Le résultat d'un site est la somme
 * de ses lignes. Une clé de répartition est une vue : elle n'augmente pas le total.
 * Il n'existe pas d'écriture de transfert interne.
 */

export interface EmissionSiteLine {
  siteId: string | null;
  scope: 1 | 2 | 3;
  kg: number;
}

export interface ScopeAllocation {
  siteId: string;
  scope: 1 | 2 | 3;
  percent: number;
}

export interface SiteScopeKg {
  1: number;
  2: number;
  3: number;
}

export interface SiteRollupRow {
  siteId: string;
  kg: number;
  scopes: SiteScopeKg;
}

export interface AllocationOverlap {
  siteId: string;
  scope: 1 | 2 | 3;
  ownKg: number;
  percent: number;
}

export interface AllocationView {
  siteId: string;
  scope: 1 | 2 | 3;
  kg: number;
}

export interface SiteRollup {
  organizationKg: number;
  sites: SiteRollupRow[];
  unassignedKg: number;
  sitesPlusUnassignedKg: number;
  balanced: boolean;
  overlaps: AllocationOverlap[];
  allocationViews: AllocationView[];
  percentGaps: Array<{ scope: 1 | 2 | 3; sum: number }>;
}

const EMPTY_SCOPES = (): SiteScopeKg => ({ 1: 0, 2: 0, 3: 0 });

function sameKg(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

export function rollupSites(
  lines: EmissionSiteLine[],
  allocations: ScopeAllocation[] = [],
): SiteRollup {
  const organizationKg = lines.reduce((sum, line) => sum + line.kg, 0);
  const bySite = new Map<string, SiteRollupRow>();
  let unassignedKg = 0;
  const scopeOrg: SiteScopeKg = EMPTY_SCOPES();
  const scopeBySite = new Map<string, SiteScopeKg>();

  for (const line of lines) {
    if (line.scope === 1 || line.scope === 2 || line.scope === 3) {
      scopeOrg[line.scope] += line.kg;
    }
    if (!line.siteId) {
      unassignedKg += line.kg;
      continue;
    }
    const row = bySite.get(line.siteId) ?? {
      siteId: line.siteId,
      kg: 0,
      scopes: EMPTY_SCOPES(),
    };
    row.kg += line.kg;
    if (line.scope === 1 || line.scope === 2 || line.scope === 3) {
      row.scopes[line.scope] += line.kg;
    }
    bySite.set(line.siteId, row);
    const scopes = scopeBySite.get(line.siteId) ?? EMPTY_SCOPES();
    if (line.scope === 1 || line.scope === 2 || line.scope === 3) {
      scopes[line.scope] += line.kg;
    }
    scopeBySite.set(line.siteId, scopes);
  }

  const sites = [...bySite.values()].sort((a, b) => b.kg - a.kg);
  const sitesPlusUnassignedKg = sites.reduce((sum, site) => sum + site.kg, 0) + unassignedKg;

  const overlaps: AllocationOverlap[] = [];
  const allocationViews: AllocationView[] = [];
  const percentByScope = new Map<number, number>();

  for (const allocation of allocations) {
    if (!(allocation.percent > 0)) continue;
    percentByScope.set(
      allocation.scope,
      (percentByScope.get(allocation.scope) ?? 0) + allocation.percent,
    );
    const ownKg = scopeBySite.get(allocation.siteId)?.[allocation.scope] ?? 0;
    if (ownKg > 0) {
      overlaps.push({
        siteId: allocation.siteId,
        scope: allocation.scope,
        ownKg,
        percent: allocation.percent,
      });
      continue;
    }
    allocationViews.push({
      siteId: allocation.siteId,
      scope: allocation.scope,
      kg: scopeOrg[allocation.scope] * (allocation.percent / 100),
    });
  }

  const percentGaps = [1, 2, 3]
    .filter((scope) => percentByScope.has(scope))
    .map((scope) => ({ scope: scope as 1 | 2 | 3, sum: percentByScope.get(scope) ?? 0 }))
    .filter((item) => !sameKg(item.sum, 100));

  return {
    organizationKg,
    sites,
    unassignedKg,
    sitesPlusUnassignedKg,
    balanced: sameKg(sitesPlusUnassignedKg, organizationKg),
    overlaps,
    allocationViews,
    percentGaps,
  };
}
