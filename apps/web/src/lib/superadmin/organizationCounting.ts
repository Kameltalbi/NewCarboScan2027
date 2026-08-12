type OrganizationSource = 'gratuit' | 'cbam' | 'inscription' | 'manuel' | 'commande';

export interface CountableOrganization {
  user_id: string;
  source?: OrganizationSource | string;
  nom_entreprise?: string;
  email?: string;
}

interface OrganizationCountSources {
  profiles: Array<{ user_id: string; company_name?: string | null }>;
  companies: Array<{ user_id: string; nom_entreprise?: string | null }>;
  validatedOrders: Array<unknown>;
  calculatorRegistrations: Array<unknown>;
}

const ALWAYS_RETAINED_SOURCES = new Set(['gratuit', 'cbam', 'commande']);

const ORGANIZATION_NAMES_BY_EMAIL: Record<string, string> = {
  'qualite@baguetteetbaguette.com': 'La Baguette',
  'mohamed.ouechtati@ennakl.com': 'Ennakl Volkswagen',
};

const CANONICAL_ORGANIZATION_NAMES: Record<string, string> = {
  'mohamed ouechtatit': 'Ennakl Volkswagen',
  'mohamed ouechtati': 'Ennakl Volkswagen',
  'ennakl volkswagen': 'Ennakl Volkswagen',
};

const ORGANIZATION_EMAILS_BY_NAME: Record<string, string> = {
  'kerem makni': 'qualite@baguetteetbaguette.com',
  'la baguette': 'qualite@baguetteetbaguette.com',
  'mohamed ouechtatit': 'Mohamed.ouechtati@ennakl.com',
  'mohamed ouechtati': 'Mohamed.ouechtati@ennakl.com',
  'ennakl volkswagen': 'Mohamed.ouechtati@ennakl.com',
};

export const resolveOrganizationDisplayName = (name: string, email?: string) =>
  (email && ORGANIZATION_NAMES_BY_EMAIL[email.trim().toLowerCase()]) ||
  CANONICAL_ORGANIZATION_NAMES[name.trim().toLowerCase()] ||
  name;

export const resolveOrganizationEmail = (name: string, email?: string) =>
  ORGANIZATION_EMAILS_BY_NAME[name.trim().toLowerCase()] || email || 'N/A';

/**
 * Mirrors the Organisations page rule: calculator registrations and validated
 * orders are individual rows, while profiles and companies are deduplicated by user.
 */
export const countMergedOrganizations = ({
  profiles,
  companies,
  validatedOrders,
  calculatorRegistrations,
}: OrganizationCountSources) => {
  const accountKeys = new Set([
    ...profiles.map(({ user_id, company_name }) =>
      CANONICAL_ORGANIZATION_NAMES[(company_name || '').trim().toLowerCase()] || user_id),
    ...companies.map(({ user_id, nom_entreprise }) =>
      CANONICAL_ORGANIZATION_NAMES[(nom_entreprise || '').trim().toLowerCase()] || user_id),
  ]);

  return accountKeys.size + validatedOrders.length + calculatorRegistrations.length;
};

export const deduplicateOrganizationRows = <T extends CountableOrganization>(rows: T[]) => {
  const seenAccountUserIds = new Set<string>();
  const seenCanonicalOrganizations = new Set<string>();

  return rows.filter((row) => {
    if (row.source && ALWAYS_RETAINED_SOURCES.has(row.source)) return true;
    if (seenAccountUserIds.has(row.user_id)) return false;

    const canonicalName = row.nom_entreprise?.trim().toLowerCase();
    if (canonicalName && CANONICAL_ORGANIZATION_NAMES[canonicalName]) {
      const canonicalKey = CANONICAL_ORGANIZATION_NAMES[canonicalName].toLowerCase();
      if (seenCanonicalOrganizations.has(canonicalKey)) return false;
      seenCanonicalOrganizations.add(canonicalKey);
    }

    seenAccountUserIds.add(row.user_id);
    return true;
  });
};
