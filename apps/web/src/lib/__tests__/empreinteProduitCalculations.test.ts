/**
 * Tests de robustesse pour empreinteProduitCalculations.ts
 * 
 * Ces tests vérifient les INVARIANTS et la COHÉRENCE des calculs,
 * PAS les valeurs exactes. Ils ne cassent jamais quand on modifie
 * un facteur d'émission — ils cassent seulement si la LOGIQUE est brisée.
 */
import { describe, it, expect } from 'vitest';
import { calculateEmpreinteProduitEmissions, calculateEmpreinteProduit, getEmissionIntensity, CarboStartFormData } from '../empreinteProduitCalculations';
import { emissionFactors, conversionFactors } from '../emissionFactors';

// ============================================================
// Cohérence des facteurs d'émission — vérifie qu'ils existent
// et sont dans des plages physiquement raisonnables
// ============================================================
describe('Facteurs d\'émission — cohérence', () => {
  it('les facteurs combustibles existent et sont positifs', () => {
    expect(emissionFactors.combustibles.gaz_naturel).toBeGreaterThan(0);
    expect(emissionFactors.combustibles.fioul_lourd).toBeGreaterThan(0);
    expect(emissionFactors.combustibles.charbon).toBeGreaterThan(0);
    expect(emissionFactors.combustibles.biomasse).toBeGreaterThanOrEqual(0);
    expect(emissionFactors.combustibles.essence).toBeGreaterThan(0);
    expect(emissionFactors.combustibles.diesel).toBeGreaterThan(0);
  });

  it('les facteurs électricité existent et sont positifs', () => {
    expect(emissionFactors.electricite.tunisie).toBeGreaterThan(0);
    expect(emissionFactors.electricite.vapeur).toBeGreaterThan(0);
  });

  it('les facteurs transport existent et sont positifs', () => {
    expect(emissionFactors.transports.train).toBeGreaterThan(0);
    expect(emissionFactors.transports.avion_court).toBeGreaterThan(0);
    expect(emissionFactors.transports.avion_long).toBeGreaterThan(0);
    expect(emissionFactors.transports.voiture_moyenne).toBeGreaterThan(0);
    expect(emissionFactors.transports.transport_public).toBeGreaterThan(0);
  });

  it('avion émet plus que train (cohérence physique)', () => {
    expect(emissionFactors.transports.avion_court).toBeGreaterThan(emissionFactors.transports.train);
  });

  it('voiture émet plus que transport public', () => {
    expect(emissionFactors.transports.voiture_moyenne).toBeGreaterThan(emissionFactors.transports.transport_public);
  });

  it('décharge émet plus que recyclage', () => {
    expect(emissionFactors.dechets.decharge).toBeGreaterThan(emissionFactors.dechets.recyclage);
  });

  it('les facteurs sont immuables (Object.freeze)', () => {
    const original = emissionFactors.combustibles.diesel;
    // Tenter de modifier — ne doit pas changer
    try { (emissionFactors.combustibles as any).diesel = 999; } catch { /* strict mode */ }
    expect(emissionFactors.combustibles.diesel).toBe(original);
  });

  it('les facteurs de conversion sont cohérents', () => {
    expect(conversionFactors.joursParAn).toBeGreaterThan(200);
    expect(conversionFactors.joursParAn).toBeLessThan(260);
    expect(conversionFactors.semainesParAn).toBe(52);
    expect(conversionFactors.aller_retour).toBe(2);
  });
});

// ============================================================
// Tests de calculateEmpreinteProduitEmissions (CarboStart form)
// ============================================================
describe('calculateEmpreinteProduitEmissions', () => {
  const baseData: CarboStartFormData = {
    flotte: 'Non',
    nb_vehicules: 0,
    km_flotte: 0,
    carburant: '',
    equipements: 'Non',
    conso_equipements: 0,
    surface_locaux: 0,
    conso_electricite: 0,
    fournisseur_renouvelable: 'Non',
    mode_chauffage: '',
    conso_chauffage: 0,
    nb_collaborateurs: 0,
    jours_site: 5,
    transport_collaborateurs: 'voiture',
    distance_domicile: 0,
    vols_court: 0,
    vols_moyen: 0,
    vols_long: 0,
    voyages_train: 0,
    achats_biens: 0,
    prestations_sous_traitees: 'Non',
    dechets: 0,
    tri_dechets: 'Non',
    postes_info: 0,
    telephones: 0,
    cloud: 'Non',
    secteur_activite: '',
    nb_sites_filiales: 1,
    chiffre_affaires_tnd: 0,
    ca_annuel: 0,
    email_contact: '',
  };

  // --- Invariants fondamentaux ---
  it('retourne zéro pour des données vides', () => {
    const result = calculateEmpreinteProduitEmissions(baseData);
    expect(result.totalEmissions).toBe(0);
    expect(result.scope1).toBe(0);
    expect(result.scope3).toBe(0);
  });

  it('totalEmissions === scope1 + scope2 + scope3', () => {
    const data: CarboStartFormData = {
      ...baseData,
      flotte: 'Oui', nb_vehicules: 5, km_flotte: 50000, carburant: 'Diesel',
      conso_electricite: 100000,
      nb_collaborateurs: 20, distance_domicile: 15,
      vols_court: 10, achats_biens: 50000,
      dechets: 5, tri_dechets: 'Non',
      postes_info: 10, telephones: 20, cloud: 'Oui',
    };
    const result = calculateEmpreinteProduitEmissions(data);
    expect(result.totalEmissions).toBeCloseTo(result.scope1 + result.scope2 + result.scope3, 4);
  });

  it('aucune émission négative', () => {
    const data = { ...baseData, conso_electricite: 50000, nb_collaborateurs: 10, distance_domicile: 20, vols_court: 5 };
    const result = calculateEmpreinteProduitEmissions(data);
    expect(result.scope1).toBeGreaterThanOrEqual(0);
    expect(result.scope2).toBeGreaterThanOrEqual(0);
    expect(result.scope3).toBeGreaterThanOrEqual(0);
    result.categoryBreakdown.forEach(cat => {
      expect(cat.value).toBeGreaterThanOrEqual(0);
    });
  });

  it('majorityScope est 1, 2 ou 3', () => {
    const data = { ...baseData, conso_electricite: 1000000 };
    const result = calculateEmpreinteProduitEmissions(data);
    expect([1, 2, 3]).toContain(result.majorityScope);
  });

  // --- Scope 1 : plus de km → plus d'émissions ---
  it('doubler les km double les émissions de flotte', () => {
    const data1 = { ...baseData, flotte: 'Oui', nb_vehicules: 1, km_flotte: 10000, carburant: 'Diesel' };
    const data2 = { ...baseData, flotte: 'Oui', nb_vehicules: 1, km_flotte: 20000, carburant: 'Diesel' };
    const r1 = calculateEmpreinteProduitEmissions(data1);
    const r2 = calculateEmpreinteProduitEmissions(data2);
    expect(r2.scope1).toBeCloseTo(r1.scope1 * 2, 0);
  });

  it('électrique émet moins que diesel', () => {
    const diesel = { ...baseData, flotte: 'Oui', nb_vehicules: 1, km_flotte: 10000, carburant: 'Diesel' };
    const elec = { ...baseData, flotte: 'Oui', nb_vehicules: 1, km_flotte: 10000, carburant: 'Électrique' };
    const rDiesel = calculateEmpreinteProduitEmissions(diesel);
    const rElec = calculateEmpreinteProduitEmissions(elec);
    expect(rElec.scope1).toBeLessThan(rDiesel.scope1);
  });

  // --- Scope 2 : proportionnel à la conso ---
  it('doubler la conso électrique double les émissions scope 2', () => {
    const data1 = { ...baseData, conso_electricite: 50000 };
    const data2 = { ...baseData, conso_electricite: 100000 };
    const r1 = calculateEmpreinteProduitEmissions(data1);
    const r2 = calculateEmpreinteProduitEmissions(data2);
    expect(r2.scope2).toBeCloseTo(r1.scope2 * 2, 0);
  });

  // --- Scope 3 : cohérence ---
  it('transport public émet moins que voiture', () => {
    const voiture = { ...baseData, nb_collaborateurs: 10, distance_domicile: 20, jours_site: 5, transport_collaborateurs: 'voiture' };
    const tp = { ...baseData, nb_collaborateurs: 10, distance_domicile: 20, jours_site: 5, transport_collaborateurs: 'transport public' };
    const rV = calculateEmpreinteProduitEmissions(voiture);
    const rTP = calculateEmpreinteProduitEmissions(tp);
    expect(rTP.scope3).toBeLessThan(rV.scope3);
  });

  it('tri des déchets réduit les émissions', () => {
    const sansTri = { ...baseData, dechets: 10, tri_dechets: 'Non' };
    const avecTri = { ...baseData, dechets: 10, tri_dechets: 'Oui' };
    const rSans = calculateEmpreinteProduitEmissions(sansTri);
    const rAvec = calculateEmpreinteProduitEmissions(avecTri);
    expect(rAvec.scope3).toBeLessThan(rSans.scope3);
  });

  it('plus de vols → plus d\'émissions', () => {
    const peu = { ...baseData, vols_court: 2 };
    const beaucoup = { ...baseData, vols_court: 20 };
    const rPeu = calculateEmpreinteProduitEmissions(peu);
    const rBeaucoup = calculateEmpreinteProduitEmissions(beaucoup);
    expect(rBeaucoup.scope3).toBeGreaterThan(rPeu.scope3);
  });

  it('achats > 0 génère des émissions scope 3', () => {
    const data = { ...baseData, achats_biens: 100000 };
    const result = calculateEmpreinteProduitEmissions(data);
    expect(result.scope3).toBeGreaterThan(0);
  });

  it('cloud Oui génère des émissions scope 3', () => {
    const data = { ...baseData, cloud: 'Oui', nb_collaborateurs: 20 };
    const result = calculateEmpreinteProduitEmissions(data);
    expect(result.scope3).toBeGreaterThan(0);
  });

  it('IT: postes et téléphones génèrent des émissions', () => {
    const data = { ...baseData, postes_info: 10, telephones: 20 };
    const result = calculateEmpreinteProduitEmissions(data);
    expect(result.scope3).toBeGreaterThan(0);
  });
});

// ============================================================
// Tests de getEmissionIntensity — protection division par zéro
// ============================================================
describe('getEmissionIntensity', () => {
  it('retourne un nombre positif pour des valeurs valides', () => {
    expect(getEmissionIntensity(1000, 500000)).toBeGreaterThan(0);
  });

  it('retourne 0 si revenue = 0 (pas de division par zéro)', () => {
    expect(getEmissionIntensity(1000, 0)).toBe(0);
  });

  it('retourne 0 si revenue négatif', () => {
    expect(getEmissionIntensity(1000, -100)).toBe(0);
  });
});

// ============================================================
// Tests de calculateEmpreinteProduit (SurveyData form)
// ============================================================
describe('calculateEmpreinteProduit — invariants', () => {
  it('totalEmissions === scope1 + scope2 + scope3', () => {
    const data = {
      companyName: 'Test Corp', sector: 'it', employeeCount: 50,
      officeSpace: 500, vehicleCount: 5, averageKilometers: '10000-25000',
      heatingSource: 'gaz', gasConsumption: '1000-3000',
      fuelConsumption: null, woodConsumption: null,
      electricityConsumption: '15000-50000',
      shortFlights: 10, mediumFlights: 5, longFlights: 2, trainTrips: 15,
      laptops: 30, mobilePhones: 50, monitors: 20, desktopComputers: 10,
    };
    const result = calculateEmpreinteProduit(data as any);
    expect(result.totalEmissions).toBeCloseTo(result.scope1 + result.scope2 + result.scope3, 4);
  });

  it('toutes les catégories ont un scope valide (1, 2 ou 3)', () => {
    const data = {
      companyName: 'Test', sector: 'it', employeeCount: 10,
      officeSpace: 100, vehicleCount: 2, averageKilometers: '10000-25000',
      heatingSource: 'électricité', electricityConsumption: '5000-15000',
      shortFlights: 5, mediumFlights: 0, longFlights: 0, trainTrips: 0,
      laptops: 5, mobilePhones: 10, monitors: 5, desktopComputers: 0,
    };
    const result = calculateEmpreinteProduit(data as any);
    result.categoryBreakdown.forEach(cat => {
      expect([1, 2, 3]).toContain(cat.scope);
    });
  });

  it('aucune émission négative', () => {
    const data = {
      companyName: 'Test', sector: 'it', employeeCount: 10,
      officeSpace: 100, vehicleCount: 0, averageKilometers: '0',
      heatingSource: 'aucun', electricityConsumption: 'moins-5000',
      shortFlights: 0, mediumFlights: 0, longFlights: 0, trainTrips: 0,
      laptops: 0, mobilePhones: 0, monitors: 0, desktopComputers: 0,
    };
    const result = calculateEmpreinteProduit(data as any);
    expect(result.totalEmissions).toBeGreaterThanOrEqual(0);
    expect(result.scope1).toBeGreaterThanOrEqual(0);
    expect(result.scope2).toBeGreaterThanOrEqual(0);
    expect(result.scope3).toBeGreaterThanOrEqual(0);
  });
});
