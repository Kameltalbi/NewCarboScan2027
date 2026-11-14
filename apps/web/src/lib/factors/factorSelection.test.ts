import { describe, expect, it } from 'vitest';
import { ademeFactorNote, parseStoredFactor } from './ademeFactor';
import { buildPortableExportRows, sumExportedEmissionsKg } from '@/lib/activity-data/portableExport';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  classifyFactor,
  resolveRecordedFactor,
  searchRequests,
  shortList,
  tunisiaElectricityCorrection,
  unitCompatibility,
  type CatalogFactor,
} from './factorSelection';

function factor(partial: Partial<CatalogFactor> & Pick<CatalogFactor, 'name' | 'unitDenominator'>): CatalogFactor {
  return {
    id: partial.id || 'fixture',
    name: partial.name,
    value: partial.value ?? 1,
    unitNumerator: partial.unitNumerator || 'kgCO2e',
    unitDenominator: partial.unitDenominator,
    sourceKey: partial.sourceKey || 'ademe',
    sourceName: partial.sourceName || 'ADEME',
    datasetVersion: partial.datasetVersion ?? null,
    countryCode: partial.countryCode ?? null,
    region: partial.region ?? null,
    factorYear: partial.factorYear ?? null,
    category: partial.category ?? null,
    stableFactorId: partial.stableFactorId ?? null,
  };
}

describe('sélection selon l’activité', () => {
  it('électricité tunisienne : pack interne du site, pas le pays du siège', () => {
    const plan = searchRequests({ subcategory: 'electricity_grid', siteCountry: 'TN' });
    expect(plan.requests).toEqual([]);
    const hq = searchRequests({ subcategory: 'electricity_grid', siteCountry: 'FR' });
    expect(hq.requests).toEqual([{ q: 'électricité', source: 'ademe', role: 'match' }]);
    expect(hq.gap).toMatch(/ADEME/);
    const other = searchRequests({ subcategory: 'electricity_grid', siteCountry: 'DE' });
    expect(other.requests[0].source).toBe('ademe');
    const missingCountry = searchRequests({ subcategory: 'electricity_grid', siteCountry: '' });
    expect(missingCountry.requests).toEqual([]);
    expect(missingCountry.gap).toMatch(/siège/);

    const tunisian = classifyFactor(
      factor({ name: 'Électricité location-based TN', unitDenominator: 'kWh', sourceKey: 'internal', sourceName: 'Pack interne', value: 0.53 }),
      { subcategory: 'electricity_grid', siteCountry: 'TN', reportingYear: 2022, activityUnit: 'kWh', requestedRole: 'match' },
    );
    expect(tunisian.role).toBe('match');
    const foreign = classifyFactor(
      factor({ name: 'Electricity France', unitDenominator: 'kWh', countryCode: 'FR' }),
      { subcategory: 'electricity_grid', siteCountry: 'TN', activityUnit: 'kWh', requestedRole: 'match' },
    );
    expect(foreign.role).toBe('replacement');
  });

  it('viande rouge ne devient pas bœuf, et cru reste distinct de cuit', () => {
    const plan = searchRequests({ subcategory: 'cat1_purchased_goods:cat1_meat_red' });
    expect(plan.requests.find((request) => request.role === 'match')?.q).toBe('viande rouge');
    expect(plan.requests.filter((request) => request.q === 'boeuf').every((request) => request.role === 'replacement')).toBe(true);
    const raw = classifyFactor(
      factor({ name: 'Bœuf, bavette, crue', unitDenominator: 'kg' }),
      { subcategory: 'cat1_meat_red', activityUnit: 'kg', requestedRole: 'replacement' },
    );
    const cooked = classifyFactor(
      factor({ name: 'Bœuf, bavette, grillée', unitDenominator: 'kg' }),
      { subcategory: 'cat1_meat_red', activityUnit: 'kg', requestedRole: 'replacement' },
    );
    expect(raw.role).toBe('replacement');
    expect(cooked.role).toBe('replacement');
    expect(cooked.reason).toMatch(/cuit/i);
    expect(shortList([raw, cooked])[0].factor.name).toMatch(/crue/);
  });

  it('gazole en litres : combustion compatible, amont écarté', () => {
    const plan = searchRequests({ subcategory: 'fuel_diesel' });
    expect(plan.requests.map((request) => request.source)).toEqual(['internal', 'ademe']);
    const combustion = classifyFactor(
      factor({ name: 'Gazole routier', unitDenominator: 'L', sourceKey: 'ademe' }),
      { subcategory: 'fuel_diesel', activityUnit: 'L', requestedRole: 'match' },
    );
    const upstream = classifyFactor(
      factor({ name: 'Gazole, émissions amont', unitDenominator: 'L' }),
      { subcategory: 'fuel_diesel', activityUnit: 'L', requestedRole: 'match' },
    );
    expect(combustion.role).toBe('match');
    expect(upstream.role).toBe('upstream');
    expect(shortList([combustion, upstream])).toEqual([combustion]);
  });

  it('absence de facteur pertinent et unité incompatible', () => {
    const food = resolveRecordedFactor({ subcategory: 'cat1_meat_red', quantity: 316.8, unit: 'kg', notes: '' });
    expect(food).toEqual({ kind: 'incomplete', reason: 'Facteur non confirmé' });
    expect(unitCompatibility('L', 'kg').ok).toBe(false);
    const notes = ademeFactorNote({ id: 'diesel', name: 'Gazole', value: 2.68, unit: 'kgCO2e/L' });
    const blocked = resolveRecordedFactor({ subcategory: 'fuel_diesel', quantity: 10, unit: 'kg', notes });
    expect(blocked.kind).toBe('incomplete');
  });

  it('une ancienne saisie conserve son facteur même si le catalogue change', () => {
    const legacy = 'FE_ADEME: 0.560|kgCO2e/kWh|ancien|Électricité historique';
    const stored = parseStoredFactor(legacy);
    expect(stored?.value).toBe(0.56);
    const line = resolveRecordedFactor({
      subcategory: 'electricity_grid',
      quantity: 23208,
      unit: 'kWh',
      notes: legacy,
    });
    expect(line).toMatchObject({ kind: 'calculated', value: 0.56, kg: 23208 * 0.56 });
    const withoutCountry = resolveRecordedFactor({ subcategory: 'electricity_grid', quantity: 23208, unit: 'kWh', notes: '' });
    expect(withoutCountry).toEqual({ kind: 'incomplete', reason: 'Pays du site manquant' });
    const tunisia = resolveRecordedFactor({
      subcategory: 'electricity_grid',
      quantity: 23208,
      unit: 'kWh',
      notes: '',
      siteCountry: 'Tunisie',
    });
    expect(tunisia).toMatchObject({ kind: 'calculated', value: 0.53, kg: 23208 * 0.53 });
    const france = resolveRecordedFactor({
      subcategory: 'electricity_grid',
      quantity: 1000,
      unit: 'kWh',
      notes: '',
      siteCountry: 'France',
    });
    expect(france).toEqual({ kind: 'incomplete', reason: 'Base ADEME à retenir, ou saisir le facteur' });
  });

  it('détail, total et export utilisent le facteur enregistré', () => {
    const notes = ademeFactorNote({
      id: 'tn-elec',
      name: 'Électricité location-based TN',
      value: 0.53,
      unit: 'kgCO2e/kWh',
      sourceKey: 'internal',
      sourceName: 'Pack interne',
      datasetVersion: 'pack-tn',
      countryCode: 'TN',
      factorYear: 2022,
      stableFactorId: 'stable-tn-elec',
    });
    const electricity = resolveRecordedFactor({ subcategory: 'electricity_grid', quantity: 1000, unit: 'kWh', notes });
    const diesel = resolveRecordedFactor({
      subcategory: 'fuel_diesel',
      quantity: 2,
      unit: 'L',
      notes: ademeFactorNote({ id: 'diesel', name: 'Gazole', value: 2.68, unit: 'kgCO2e/L', sourceName: 'ADEME' }),
    });
    expect(electricity.kind).toBe('calculated');
    expect(diesel.kind).toBe('calculated');
    if (electricity.kind !== 'calculated' || diesel.kind !== 'calculated') return;
    const scope2 = electricity.kg;
    const scope1 = diesel.kg;
    const rows = buildPortableExportRows({
      activities: [
        { id: 'elec', subcategory: 'electricity_grid', quantity: 1000, unit: 'kWh', scope_hint: 2, period_start: '2022-01-01', notes },
        { id: 'diesel', subcategory: 'fuel_diesel', quantity: 2, unit: 'L', scope_hint: 1, period_start: '2022-01-01' },
      ],
      currentByActivityId: {
        elec: { factorId: 'stable-tn-elec', factorValue: electricity.value, resultKgCo2e: electricity.kg, scope: 2 },
        diesel: { factorValue: diesel.value, resultKgCo2e: diesel.kg, scope: 1 },
      },
    });
    expect(rows[0]['Émissions kgCO2e']).toBe(scope2);
    expect(rows[1]['Émissions kgCO2e']).toBe(scope1);
    expect(sumExportedEmissionsKg(rows)).toBe(scope1 + scope2);
    expect(rows[0]['Identifiant du facteur']).toBe('stable-tn-elec');
  });

  it('corrige seulement l’électricité tunisienne sans facteur copié', () => {
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricite',
      unit: 'kWh',
      siteCountry: '',
      organizationCountry: 'Tunisie',
    })).toEqual({ correct: true, previousValue: 0.56, countryBasis: 'organisation' });
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricity_grid',
      unit: 'kWh',
      siteCountry: 'Tunisie',
      siteCountryCode: '',
      organizationCountry: 'Tunisie',
    })).toMatchObject({ correct: true, countryBasis: 'organisation' });
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricity_grid',
      unit: 'kWh',
      siteCountry: 'TN',
      catalogValue: 0.523,
    })).toMatchObject({ correct: true, countryBasis: 'site', previousValue: 0.523 });
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricity',
      unit: 'MWh',
      siteCountry: 'TN',
    }).correct).toBe(false);
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricity',
      unit: 'GWh',
      siteCountry: 'TN',
    }).correct).toBe(false);
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricity_grid',
      unit: 'kWh',
      siteCountry: 'FR',
      organizationCountry: 'Tunisie',
    }).correct).toBe(false);
    expect(tunisiaElectricityCorrection({
      subcategory: 'fuel_diesel',
      unit: 'L',
      siteCountry: 'TN',
    }).correct).toBe(false);
    const copied = ademeFactorNote({ id: 'deja', name: 'Électricité', value: 0.4, unit: 'kgCO2e/kWh' });
    expect(tunisiaElectricityCorrection({
      subcategory: 'electricity_grid',
      unit: 'kWh',
      siteCountry: 'TN',
      notes: copied,
    }).correct).toBe(false);

    const confirmed = resolveRecordedFactor({
      subcategory: 'electricity_grid',
      quantity: 1000,
      unit: 'kWh',
      notes: ademeFactorNote({ id: 'tn', name: 'Électricité location-based TN', value: 0.53, unit: 'kgCO2e/kWh', sourceName: 'Newcarboscan Core Pack TN' }),
    });
    const missing = resolveRecordedFactor({ subcategory: 'electricity_grid', quantity: 500, unit: 'kWh', notes: '' });
    expect(confirmed.kind).toBe('calculated');
    expect(missing.kind).toBe('incomplete');
    const counted = confirmed.kind === 'calculated' ? confirmed.kg : 0;
    expect(counted).toBe(530);
    expect(counted + 0).toBe(530);
  });

  it('la migration 055 a une descente qui restaure la valeur précédente', () => {
    const up = readFileSync(resolve(process.cwd(), '../../db/migrations/055_tn_electricity_053.sql'), 'utf8');
    const down = readFileSync(resolve(process.cwd(), '../../db/migrations/down/055_tn_electricity_053.sql'), 'utf8');
    expect(up).toContain('0.53');
    expect(up).toContain('correction facteur erroné');
    expect(up).toContain("pays déduit de l''organisation");
    expect(up).toContain('Facteur électricité corrigé depuis la validation');
    expect(up).toContain("lower(a.unit) = 'kwh'");
    expect(up).not.toMatch(/UPDATE bilans_carbone/);
    expect(up).not.toMatch(/fuel_diesel|2\.68/);
    expect(down).toContain('factor_correction_previous_notes');
    expect(down).toContain('previous_value');
    expect(down).toContain('DROP TABLE IF EXISTS bilan_electricity_notices');
  });
});
