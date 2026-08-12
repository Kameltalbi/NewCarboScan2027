// Base de données des matériaux avec facteurs d'émission
// Facteurs en kg CO2e par kg de matériau (sauf indication contraire)

export interface MaterialData {
  id: string;
  name: string;
  category: string;
  emissionFactor: number; // kg CO2e/kg (ou unité spécifiée)
  unit: string;
  source: string;
  notes?: string;
}

export const MATERIALS_DATABASE: MaterialData[] = [
  // Métaux
  {
    id: 'steel',
    name: 'Acier',
    category: 'métal',
    emissionFactor: 1.85,
    unit: 'kg',
    source: 'Base Carbone ADEME',
    notes: 'Acier moyen'
  },
  {
    id: 'aluminum',
    name: 'Aluminium',
    category: 'métal',
    emissionFactor: 8.24,
    unit: 'kg',
    source: 'Base Carbone ADEME',
    notes: 'Aluminium primaire'
  },
  {
    id: 'copper',
    name: 'Cuivre',
    category: 'métal',
    emissionFactor: 3.5,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Plastiques
  {
    id: 'plastic-pe',
    name: 'Polyéthylène (PE)',
    category: 'plastique',
    emissionFactor: 1.83,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  {
    id: 'plastic-pp',
    name: 'Polypropylène (PP)',
    category: 'plastique',
    emissionFactor: 1.95,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  {
    id: 'plastic-pet',
    name: 'PET',
    category: 'plastique',
    emissionFactor: 2.15,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  {
    id: 'plastic-pvc',
    name: 'PVC',
    category: 'plastique',
    emissionFactor: 2.41,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Textiles
  {
    id: 'cotton',
    name: 'Coton',
    category: 'textile',
    emissionFactor: 5.9,
    unit: 'kg',
    source: 'Base Carbone ADEME',
    notes: 'Coton conventionnel'
  },
  {
    id: 'polyester',
    name: 'Polyester',
    category: 'textile',
    emissionFactor: 5.5,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  {
    id: 'wool',
    name: 'Laine',
    category: 'textile',
    emissionFactor: 27.0,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Bois
  {
    id: 'wood',
    name: 'Bois',
    category: 'bois',
    emissionFactor: 0.3,
    unit: 'kg',
    source: 'Base Carbone ADEME',
    notes: 'Bois séché, stockage carbone non compté'
  },
  {
    id: 'plywood',
    name: 'Contreplaqué',
    category: 'bois',
    emissionFactor: 0.8,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Verre
  {
    id: 'glass',
    name: 'Verre',
    category: 'verre',
    emissionFactor: 0.85,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Ciment et béton
  {
    id: 'cement',
    name: 'Ciment',
    category: 'construction',
    emissionFactor: 0.83,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  {
    id: 'concrete',
    name: 'Béton',
    category: 'construction',
    emissionFactor: 0.3,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Alimentaire
  {
    id: 'wheat',
    name: 'Blé',
    category: 'alimentaire',
    emissionFactor: 0.5,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  {
    id: 'milk',
    name: 'Lait',
    category: 'alimentaire',
    emissionFactor: 1.2,
    unit: 'kg',
    source: 'Base Carbone ADEME'
  },
  
  // Électronique
  {
    id: 'silicon',
    name: 'Silicium',
    category: 'électronique',
    emissionFactor: 15.0,
    unit: 'kg',
    source: 'Estimation'
  },
  {
    id: 'circuit-board',
    name: 'Carte électronique',
    category: 'électronique',
    emissionFactor: 12.0,
    unit: 'kg',
    source: 'Estimation',
    notes: 'Valeur moyenne pour carte électronique'
  },
];

export const getMaterialById = (id: string): MaterialData | undefined => {
  return MATERIALS_DATABASE.find(m => m.id === id);
};

export const searchMaterials = (query: string): MaterialData[] => {
  const lowerQuery = query.toLowerCase();
  return MATERIALS_DATABASE.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.category.toLowerCase().includes(lowerQuery)
  );
};

export const getMaterialsByCategory = (category: string): MaterialData[] => {
  return MATERIALS_DATABASE.filter(m => m.category === category);
};

