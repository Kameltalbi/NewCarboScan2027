import { describe, expect, it } from 'vitest';
import {
  countMergedOrganizations,
  deduplicateOrganizationRows,
  resolveOrganizationDisplayName,
  resolveOrganizationEmail,
} from '../organizationCounting';

describe('organization counting', () => {
  it('deduplicates profiles and companies by user and keeps every order and registration', () => {
    expect(countMergedOrganizations({
      profiles: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      companies: [{ user_id: 'user-1' }, { user_id: 'user-3' }],
      validatedOrders: [{ id: 'order-1' }, { id: 'order-2' }],
      calculatorRegistrations: [{ id: 'lead-1' }],
    })).toBe(6);
  });

  it('keeps orders and calculator registrations even when their user already has an account row', () => {
    const rows = deduplicateOrganizationRows([
      { user_id: 'user-1', source: 'inscription' },
      { user_id: 'user-1', source: 'manuel' },
      { user_id: 'user-1', source: 'commande' },
      { user_id: 'user-1', source: 'gratuit' },
    ]);

    expect(rows.map(({ source }) => source)).toEqual(['inscription', 'commande', 'gratuit']);
  });

  it('uses the company name configured for a known business email', () => {
    expect(resolveOrganizationDisplayName('Kerem Makni', 'qualite@baguetteetbaguette.com')).toBe('La Baguette');
    expect(resolveOrganizationDisplayName('Autre société', 'contact@example.com')).toBe('Autre société');
  });

  it('restores the known business email when the source does not expose it', () => {
    expect(resolveOrganizationEmail('Kerem Makni', 'N/A')).toBe('qualite@baguetteetbaguette.com');
    expect(resolveOrganizationEmail('La Baguette')).toBe('qualite@baguetteetbaguette.com');
  });

  it('merges the Ennakl person and company rows under the canonical identity', () => {
    const rows = deduplicateOrganizationRows([
      {
        user_id: 'profile-user',
        source: 'inscription',
        nom_entreprise: resolveOrganizationDisplayName('Mohamed Ouechtatit'),
        email: resolveOrganizationEmail('Mohamed Ouechtatit', 'N/A'),
      },
      {
        user_id: 'company-user',
        source: 'manuel',
        nom_entreprise: resolveOrganizationDisplayName('Ennakl Volkswagen'),
        email: resolveOrganizationEmail('Ennakl Volkswagen', 'N/A'),
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      nom_entreprise: 'Ennakl Volkswagen',
      email: 'Mohamed.ouechtati@ennakl.com',
    });
  });
});
