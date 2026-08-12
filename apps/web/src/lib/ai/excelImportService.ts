// Service intelligent pour l'import Excel/CSV avec parsing automatique
import ExcelJS from 'exceljs';

export interface ExcelImportResult {
  success: boolean;
  imported_count: number;
  responses: Array<{
    question_key: string;
    value: any;
    unit?: string;
    confidence: number;
    source_row?: number;
  }>;
  errors: Array<{
    row: number;
    column: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * Mapping intelligent des colonnes Excel vers les questions CarboScan
 * Étendu pour supporter plus de formats courants
 */
const COLUMN_MAPPINGS: Record<string, string> = {
  // === ÉLECTRICITÉ ===
  'electricite': 'electricite_quantite',
  'electricite_kwh': 'electricite_quantite',
  'consommation_electricite': 'electricite_quantite',
  'kwh': 'electricite_quantite',
  'electricity': 'electricite_quantite',
  'conso_elec': 'electricite_quantite',
  'energie_electrique': 'electricite_quantite',
  'steg': 'electricite_quantite', // Tunisie specific
  'mwh': 'electricite_quantite',
  
  // === GAZ ===
  'gaz': 'gaz_naturel_quantite',
  'gaz_naturel': 'gaz_naturel_quantite',
  'gaz_m3': 'gaz_naturel_quantite',
  'consommation_gaz': 'gaz_naturel_quantite',
  'gas': 'gaz_naturel_quantite',
  'natural_gas': 'gaz_naturel_quantite',
  'steg_gaz': 'gaz_naturel_quantite',
  'm3_gaz': 'gaz_naturel_quantite',
  'thermie': 'gaz_naturel_quantite',
  
  // === CARBURANTS ===
  'fioul': 'fioul_quantite',
  'fuel': 'fioul_quantite',
  'mazout': 'fioul_quantite',
  'consommation_fioul': 'fioul_quantite',
  'diesel': 'diesel_quantite',
  'gasoil': 'diesel_quantite',
  'gazole': 'diesel_quantite',
  'essence': 'essence_quantite',
  'carburant': 'carburant_quantite',
  'litres_carburant': 'carburant_quantite',
  'l_carburant': 'carburant_quantite',
  'gpl': 'gpl_quantite',
  
  // === SCOPE 1 - Émissions directes ===
  'scope_1': 'emissions_scope1',
  'scope1': 'emissions_scope1',
  'emissions_directes': 'emissions_scope1',
  'direct_emissions': 'emissions_scope1',
  'combustion': 'combustion_quantite',
  'chaudiere': 'chaudiere_quantite',
  'climatisation': 'climatisation_quantite',
  'froid': 'climatisation_quantite',
  'refrigerant': 'refrigerant_quantite',
  'fluide_frigorigene': 'refrigerant_quantite',
  
  // === SCOPE 2 - Énergie ===
  'scope_2': 'emissions_scope2',
  'scope2': 'emissions_scope2',
  'emissions_indirectes': 'emissions_scope2',
  'indirect_emissions': 'emissions_scope2',
  'energie': 'energie_quantite',
  'energy': 'energie_quantite',
  
  // === SCOPE 3 - Amont ===
  'scope_3': 'emissions_scope3',
  'scope3': 'emissions_scope3',
  'scope_3_amont': 'emissions_scope3_amont',
  'achats': 'achats_quantite',
  'purchases': 'achats_quantite',
  'matieres_premieres': 'matieres_premieres_quantite',
  'raw_materials': 'matieres_premieres_quantite',
  'fret': 'fret_quantite',
  'freight': 'fret_quantite',
  
  // === CO2 / EMISSIONS ===
  'co2': 'emissions_co2',
  'co2e': 'emissions_co2',
  'tco2': 'emissions_co2',
  'tco2e': 'emissions_co2',
  'emissions': 'emissions_co2',
  'emission': 'emissions_co2',
  'ges': 'emissions_co2',
  'ghg': 'emissions_co2',
  'carbon': 'emissions_co2',
  'carbone': 'emissions_co2',
  'empreinte': 'emissions_co2',
  'footprint': 'emissions_co2',
  'bilan': 'emissions_co2',
  'kg_co2': 'emissions_co2',
  'tonnes_co2': 'emissions_co2',
  
  // === SURFACE ===
  'surface': 'total_surface',
  'surface_m2': 'total_surface',
  'superficie': 'total_surface',
  'area': 'total_surface',
  'm2': 'total_surface',
  
  // === EMPLOYÉS ===
  'employes': 'nb_collaborateurs',
  'nombre_employes': 'nb_collaborateurs',
  'effectif': 'nb_collaborateurs',
  'personnel': 'nb_collaborateurs',
  'employees': 'nb_collaborateurs',
  'headcount': 'nb_collaborateurs',
  'etp': 'nb_collaborateurs',
  'fte': 'nb_collaborateurs',
  
  // === TRANSPORT ===
  'kilometrage': 'km_flotte',
  'km': 'km_flotte',
  'distance': 'km_flotte',
  'vehicules': 'nb_vehicules',
  'nombre_vehicules': 'nb_vehicules',
  'flotte': 'km_flotte',
  'fleet': 'km_flotte',
  'deplacement': 'deplacements_quantite',
  'travel': 'deplacements_quantite',
  'voyage': 'voyages_quantite',
  'avion': 'avion_quantite',
  'flight': 'avion_quantite',
  'train': 'train_quantite',
  
  // === DÉCHETS ===
  'dechets': 'dechets_quantite',
  'dechets_tonnes': 'dechets_quantite',
  'quantite_dechets': 'dechets_quantite',
  'waste': 'dechets_quantite',
  'recyclage': 'recyclage_quantite',
  'recycling': 'recyclage_quantite',
  
  // === EAU ===
  'eau': 'eau_quantite',
  'water': 'eau_quantite',
  'consommation_eau': 'eau_quantite',
  'm3_eau': 'eau_quantite',
  
  // === QUANTITÉ GÉNÉRIQUE ===
  'quantite': 'quantite_generique',
  'quantity': 'quantite_generique',
  'valeur': 'quantite_generique',
  'value': 'quantite_generique',
  'montant': 'quantite_generique',
  'amount': 'quantite_generique',
  'total': 'quantite_generique',
  'donnee': 'quantite_generique',
  'data': 'quantite_generique',
};

/**
 * Service intelligent pour l'import Excel/CSV
 */
export class ExcelImportService {
  /**
   * Parser un fichier Excel/CSV et extraire les données
   */
  static async parseFile(file: File): Promise<ExcelImportResult> {
    try {
      let jsonData: any[][];
      
      // Détecter le type de fichier
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'csv') {
        // Parser CSV
        const text = await file.text();
        jsonData = this.parseCSV(text);
      } else {
        // Parser Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        // Prendre la première feuille
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet || worksheet.rowCount === 0) {
          return {
            success: false,
            imported_count: 0,
            responses: [],
            errors: [{ row: 0, column: 'A', error: 'Fichier vide ou aucune feuille trouvée' }],
            warnings: [],
          };
        }

        // Convertir en tableau de données
        jsonData = [];
        worksheet.eachRow((row, rowNumber) => {
          const rowData: any[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rowData[colNumber - 1] = cell.value;
          });
          jsonData[rowNumber - 1] = rowData;
        });
      }

      if (jsonData.length === 0) {
        return {
          success: false,
          imported_count: 0,
          responses: [],
          errors: [{ row: 0, column: 'A', error: 'Fichier vide' }],
          warnings: [],
        };
      }

      // Détecter les en-têtes (première ligne)
      const headers = jsonData[0] || [];
      const normalizedHeaders = headers.map(h => this.normalizeColumnName(String(h || '')));

      // Détecter les colonnes de période
      let periodStartCol: number | null = null;
      let periodEndCol: number | null = null;
      normalizedHeaders.forEach((header, index) => {
        const normalized = header.toLowerCase();
        if (normalized.includes('periode_debut') || normalized.includes('period_start') || 
            normalized.includes('date_debut') || normalized.includes('debut')) {
          periodStartCol = index;
        }
        if (normalized.includes('periode_fin') || normalized.includes('period_end') || 
            normalized.includes('date_fin') || normalized.includes('fin')) {
          periodEndCol = index;
        }
      });

      // Mapper les colonnes aux questions
      const columnMapping: Record<number, string> = {};
      normalizedHeaders.forEach((header, index) => {
        // Ignorer les colonnes de période (gérées séparément)
        if (index === periodStartCol || index === periodEndCol) {
          return;
        }
        const questionKey = this.findQuestionKey(header);
        if (questionKey) {
          columnMapping[index] = questionKey;
        }
      });

      // Parser les données
      const responses: ExcelImportResult['responses'] = [];
      const errors: ExcelImportResult['errors'] = [];
      const warnings: ExcelImportResult['warnings'] = [];

      for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex] || [];
        
        // Ignorer les lignes vides
        if (row.every(cell => !cell || String(cell).trim() === '')) {
          continue;
        }

        // Extraire les périodes pour cette ligne (si disponibles)
        let rowPeriodStart: string | null = null;
        let rowPeriodEnd: string | null = null;
        
        if (periodStartCol !== null && row[periodStartCol]) {
          rowPeriodStart = this.parseDate(String(row[periodStartCol]));
        }
        if (periodEndCol !== null && row[periodEndCol]) {
          rowPeriodEnd = this.parseDate(String(row[periodEndCol]));
        }

        // Parser chaque colonne mappée
        Object.entries(columnMapping).forEach(([colIndex, questionKey]) => {
          const value = row[parseInt(colIndex)];
          
          if (value === undefined || value === null || value === '') {
            return;
          }

          try {
            const parsedValue = this.parseValue(value, questionKey);
            const unit = this.getUnitForQuestion(questionKey);
            
            responses.push({
              question_key: questionKey,
              value: parsedValue,
              unit,
              confidence: 0.9, // Confiance élevée pour import Excel
              source_row: rowIndex + 1,
              // Ajouter les périodes si disponibles
              period_start: rowPeriodStart || undefined,
              period_end: rowPeriodEnd || undefined,
            } as any);
          } catch (error) {
            errors.push({
              row: rowIndex + 1,
              column: String.fromCharCode(65 + parseInt(colIndex)), // A, B, C...
              error: error instanceof Error ? error.message : 'Erreur de parsing',
            });
          }
        });
      }

      return {
        success: errors.length === 0,
        imported_count: responses.length,
        responses,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        imported_count: 0,
        responses: [],
        errors: [{
          row: 0,
          column: 'A',
          error: error instanceof Error ? error.message : 'Erreur lors du parsing du fichier',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Normaliser le nom d'une colonne pour la comparaison
   */
  private static normalizeColumnName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * Trouver la question correspondant à un nom de colonne
   */
  private static findQuestionKey(columnName: string): string | null {
    const normalized = this.normalizeColumnName(columnName);
    
    // Recherche exacte
    if (COLUMN_MAPPINGS[normalized]) {
      return COLUMN_MAPPINGS[normalized];
    }

    // Recherche partielle
    for (const [key, questionKey] of Object.entries(COLUMN_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return questionKey;
      }
    }

    return null;
  }

  /**
   * Parser une valeur selon le type de question
   */
  private static parseValue(value: any, questionKey: string): any {
    // Convertir en nombre si possible
    if (typeof value === 'number') {
      return value;
    }

    const stringValue = String(value).trim();
    
    // Extraire les nombres
    const numberMatch = stringValue.match(/[\d,.\s]+/);
    if (numberMatch) {
      const numberStr = numberMatch[0].replace(/,/g, '').replace(/\s/g, '');
      const parsed = parseFloat(numberStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Pour les questions booléennes
    if (questionKey.includes('utilise') || questionKey.includes('has_')) {
      const lower = stringValue.toLowerCase();
      if (lower === 'oui' || lower === 'yes' || lower === 'true' || lower === '1') {
        return true;
      }
      if (lower === 'non' || lower === 'no' || lower === 'false' || lower === '0') {
        return false;
      }
    }

    return stringValue;
  }

  /**
   * Obtenir l'unité pour une question
   */
  private static getUnitForQuestion(questionKey: string): string {
    const units: Record<string, string> = {
      electricite_quantite: 'kWh',
      gaz_naturel_quantite: 'm³',
      fioul_quantite: 'litres',
      total_surface: 'm²',
      nb_collaborateurs: 'personnes',
      km_flotte: 'km',
      dechets: 'tonnes',
    };

    return units[questionKey] || '';
  }

  /**
   * Parser un fichier CSV
   */
  private static parseCSV(text: string): any[][] {
    const lines = text.split('\n').filter(line => line.trim());
    const data: any[][] = [];
    
    for (const line of lines) {
      // Parser CSV simple (gère les guillemets basiques)
      const row: any[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else if (char === ';' && !inQuotes) {
          // Support point-virgule (format français)
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim()); // Dernière colonne
      
      data.push(row);
    }
    
    return data;
  }

  /**
   * Parser une date depuis différents formats
   */
  private static parseDate(dateString: string): string | null {
    if (!dateString) return null;
    
    // Format ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Format français (DD/MM/YYYY)
    const frenchMatch = dateString.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
    if (frenchMatch) {
      return `${frenchMatch[3]}-${frenchMatch[2]}-${frenchMatch[1]}`;
    }
    
    // Format américain (MM/DD/YYYY)
    const usMatch = dateString.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
    if (usMatch) {
      return `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
    }
    
    // Essayer de parser avec Date
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  }

  /**
   * Générer un modèle Excel pour la collecte
   */
  static async generateTemplate(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Collecte Données');

    // En-têtes
    worksheet.columns = [
      { header: 'Question', key: 'question', width: 30 },
      { header: 'Valeur', key: 'valeur', width: 15 },
      { header: 'Unité', key: 'unite', width: 10 },
      { header: 'Source', key: 'source', width: 20 },
    ];

    // Style des en-têtes
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Exemples
    const examples = [
      { question: 'Électricité (kWh)', valeur: '', unite: 'kWh', source: 'Facture STEG' },
      { question: 'Gaz naturel (m³)', valeur: '', unite: 'm³', source: 'Facture STEG' },
      { question: 'Fuel (litres)', valeur: '', unite: 'litres', source: 'Facture' },
      { question: 'Surface totale (m²)', valeur: '', unite: 'm²', source: 'Mesure' },
      { question: "Nombre d'employés", valeur: '', unite: 'personnes', source: 'RH' },
      { question: 'Kilométrage flotte (km)', valeur: '', unite: 'km', source: 'Compteur' },
      { question: 'Nombre de véhicules', valeur: '', unite: 'véhicules', source: 'Flotte' },
      { question: 'Déchets (tonnes)', valeur: '', unite: 'tonnes', source: 'Bordereau' },
    ];

    examples.forEach(row => worksheet.addRow(row));

    return workbook;
  }

  /**
   * Télécharger le modèle Excel
   */
  static async downloadTemplate(): Promise<void> {
    const workbook = await this.generateTemplate();
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Modele_Collecte_CarboScan.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Générer un template Excel spécialisé par catégorie
   */
  static async generateCategoryTemplate(category: string): Promise<void> {
    const templates: Record<string, { headers: string[]; example: any[][]; sheetName: string }> = {
      energy: {
        sheetName: 'Énergie',
        headers: ['Période', 'Site', 'Électricité (kWh)', 'Gaz naturel (m³)', 'Fioul (litres)', 'Charbon (tonnes)', 'Biomasse (tonnes)', 'Autre énergie (kWh)', 'Source facture', 'Commentaire'],
        example: [
          ['Janvier 2025', 'Site principal', 12500, 500, 0, 0, 0, 0, 'Facture STEG', 'Consommation normale'],
          ['Janvier 2025', 'Usine Nord', 8200, 320, 150, 0, 0, 0, 'Factures', ''],
          ['Février 2025', 'Site principal', 11800, 480, 0, 0, 0, 0, 'Facture STEG', 'Baisse saisonnière'],
        ],
      },
      transport: {
        sheetName: 'Transport',
        headers: ['Date', 'Site', 'Type véhicule', 'Carburant', 'Distance (km)', 'Consommation carburant (litres)', 'Nombre trajets', 'Motif', 'Commentaire'],
        example: [
          ['01/01/2025', 'Siège', 'Voiture de service', 'Essence', 520, 42, 5, 'Déplacements clients', ''],
          ['05/01/2025', 'Entrepôt', 'Camionnette', 'Diesel', 280, 28, 3, 'Livraisons', ''],
          ['10/01/2025', 'Siège', 'Voiture électrique', 'Électrique', 150, 0, 4, 'Réunions', 'Véhicule ZE'],
        ],
      },
      purchases: {
        sheetName: 'Achats',
        headers: ['Date', 'Fournisseur', 'Catégorie achat', 'Description', 'Montant HT (TND)', 'Quantité', 'Unité', 'Pays origine', 'Commentaire'],
        example: [
          ['01/01/2025', 'Fournisseur A', 'Matières premières', 'Acier', 15000, 5, 'tonnes', 'Tunisie', ''],
          ['05/01/2025', 'Fournisseur B', 'Emballages', 'Cartons', 2500, 1000, 'unités', 'France', 'Import'],
          ['10/01/2025', 'Prestataire C', 'Services', 'Maintenance', 3500, 1, 'forfait', 'Tunisie', ''],
        ],
      },
      waste: {
        sheetName: 'Déchets',
        headers: ['Date', 'Site', 'Type déchet', 'Code déchet', 'Quantité (tonnes)', 'Mode traitement', 'Prestataire', 'Coût (TND)', 'Bordereau n°', 'Commentaire'],
        example: [
          ['01/01/2025', 'Usine', 'DIB', '20 03 01', 2.5, 'Recyclage', 'Eco-Collecte', 450, 'BSD-2025-001', ''],
          ['15/01/2025', 'Usine', 'Déchets dangereux', '15 01 10', 0.3, 'Incinération', 'SOTULUB', 1200, 'BSD-2025-002', 'Huiles usagées'],
          ['20/01/2025', 'Bureau', 'Papier/carton', '20 01 01', 0.8, 'Recyclage', 'Papeterie Verte', 0, 'BSD-2025-003', 'Valorisé'],
        ],
      },
      water: {
        sheetName: 'Eau',
        headers: ['Période', 'Site', 'Type eau', 'Consommation (m³)', 'Coût (TND)', 'Source', 'Usage principal', 'Commentaire'],
        example: [
          ['Janvier 2025', 'Site principal', 'Eau potable', 850, 1275, 'SONEDE', 'Process industriel', ''],
          ['Janvier 2025', 'Bureau', 'Eau potable', 45, 67, 'SONEDE', 'Sanitaires', ''],
          ['Février 2025', 'Site principal', 'Eau potable', 820, 1230, 'SONEDE', 'Process industriel', 'Baisse production'],
        ],
      },
      buildings: {
        sheetName: 'Bâtiments',
        headers: ['Site', 'Adresse complète', 'Ville', 'Pays', 'Surface (m²)', 'Effectif', 'Type bâtiment', 'Année construction', 'Type chauffage', 'Type climatisation', 'Commentaire'],
        example: [
          ['Siège social', '10 Avenue Habib Bourguiba', 'Tunis', 'Tunisie', 1200, 45, 'Bureaux', 2010, 'Gaz naturel', 'Split système', 'Bâtiment principal'],
          ['Usine Nord', 'Zone industrielle El Fejja', 'Manouba', 'Tunisie', 5000, 120, 'Industriel', 2005, 'Fioul', 'Évaporatif', ''],
          ['Entrepôt', 'Route de Sousse Km 5', 'Ben Arous', 'Tunisie', 2500, 15, 'Logistique', 2015, 'Aucun', 'Aucun', 'Non chauffé'],
        ],
      },
      refrigerants: {
        sheetName: 'Fluides frigorigènes',
        headers: ['Date', 'Site', 'Équipement', 'Type fluide', 'Quantité rechargée (kg)', 'Fuites estimées (kg)', 'PRG fluide', 'Intervenant', 'N° intervention', 'Commentaire'],
        example: [
          ['15/01/2025', 'Siège', 'Climatisation bureau', 'R-410A', 2.5, 1.8, 2088, 'Froid Express', 'INT-2025-001', 'Maintenance préventive'],
          ['20/01/2025', 'Usine', 'Chambre froide', 'R-404A', 5.0, 3.2, 3922, 'Cool Services', 'INT-2025-002', 'Réparation compresseur'],
        ],
      },
      biodiversity: {
        sheetName: 'Biodiversité',
        headers: ['Action', 'Date début', 'Date fin', 'Site', 'Surface concernée (m²)', 'Type intervention', 'Partenaire', 'Impact estimé (tCO2e)', 'Certification', 'Commentaire'],
        example: [
          ['Plantation oliviers', '01/11/2024', '15/12/2024', 'Terrain Sousse', 5000, 'Reboisement', 'ONF Tunisie', 2.5, 'Label Vert', '50 arbres plantés'],
          ['Création prairie', '01/03/2025', '30/03/2025', 'Site principal', 800, 'Végétalisation', 'Éco-Paysage', 0.3, '', 'Zone parking'],
        ],
      },
    };

    const template = templates[category] || templates.energy;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CarboScan';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet(template.sheetName);

    // Ajouter les en-têtes
    worksheet.addRow(template.headers);
    
    // Style des en-têtes
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Ajouter les exemples
    template.example.forEach((row, index) => {
      const dataRow = worksheet.addRow(row);
      // Alternance de couleurs pour les lignes
      if (index % 2 === 0) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      }
    });

    // Ajuster la largeur des colonnes automatiquement
    worksheet.columns.forEach((column, index) => {
      const header = template.headers[index] || '';
      let maxLength = header.length;
      
      template.example.forEach(row => {
        const cellValue = String(row[index] || '');
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      
      column.width = Math.min(Math.max(maxLength + 2, 12), 35);
    });

    // Figer la première ligne
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Ajouter une feuille d'instructions
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.addRow(['INSTRUCTIONS D\'UTILISATION']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['1. Remplissez les données dans l\'onglet "' + template.sheetName + '"']);
    instructionsSheet.addRow(['2. Conservez les en-têtes tels quels']);
    instructionsSheet.addRow(['3. Supprimez les lignes d\'exemple avant l\'import']);
    instructionsSheet.addRow(['4. Utilisez le format de date JJ/MM/AAAA ou "Mois Année"']);
    instructionsSheet.addRow(['5. Les nombres décimaux doivent utiliser le point comme séparateur']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['Pour importer: Menu "Collecte de Données" > "Imports & Fichiers"']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['Support: support@carboscan.tn']);
    
    instructionsSheet.getRow(1).font = { bold: true, size: 14 };
    instructionsSheet.getColumn(1).width = 60;

    // Télécharger
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CarboScan_Template_${template.sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
