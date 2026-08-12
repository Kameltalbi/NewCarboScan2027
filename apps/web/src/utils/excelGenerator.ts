
import ExcelJS from 'exceljs';
import { supabase } from "@/integrations/api/client";

export interface TableauCollecteData {
  designation: string;
  unite: string;
  quantite: string;
  source: string;
}

export const generateCollecteExcel = async (): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Collecte de données');

  // Définir les en-têtes
  worksheet.columns = [
    { header: 'Désignation', key: 'designation', width: 40 },
    { header: 'Unité', key: 'unite', width: 15 },
    { header: 'Quantité', key: 'quantite', width: 15 },
    { header: 'Source', key: 'source', width: 30 }
  ];

  // Ajouter les données
  const data: TableauCollecteData[] = [
    { designation: 'Nombre d\'employés', unite: 'Nombre', quantite: '', source: '' },
    { designation: 'Chiffre d\'affaires annuel', unite: 'TND', quantite: '', source: '' },
    { designation: 'Secteur d\'activité', unite: '', quantite: '', source: '' },
    { designation: 'Nombre de sites ou filiales', unite: 'Nombre', quantite: '', source: '' },
    { designation: 'Localisation de chaque site ou filiale', unite: '', quantite: '', source: '' },
    { designation: 'Gaz naturel consommé', unite: 'm³', quantite: '', source: '' },
    { designation: 'Fioul consommé', unite: 't', quantite: '', source: '' },
    { designation: 'Charbon consommé', unite: 't', quantite: '', source: '' },
    { designation: 'Biomasse consommée', unite: 't', quantite: '', source: '' },
    { designation: 'Nombre de chaudières/installations', unite: 'Nombre', quantite: '', source: '' },
    { designation: 'Électricité achetée', unite: 'kWh', quantite: '', source: '' },
    { designation: 'Vapeur achetée', unite: 't', quantite: '', source: '' },
    { designation: 'Froid industriel acheté', unite: 'kWh', quantite: '', source: '' },
    { designation: 'Chaleur achetée', unite: 'kWh', quantite: '', source: '' },
    { designation: 'Pourcentage énergie renouvelable', unite: '%', quantite: '', source: '' },
    { designation: 'Nombre de véhicules', unite: 'Nombre', quantite: '', source: '' },
    { designation: 'Carburants utilisés', unite: '', quantite: '', source: '' },
    { designation: 'Consommation carburant flotte', unite: 'L', quantite: '', source: '' },
    { designation: 'Distance moyenne véhicules', unite: 'km/an', quantite: '', source: '' },
    { designation: 'Fluide frigorigène rechargé', unite: 'kg', quantite: '', source: '' },
    { designation: 'Fuites fluides frigorigènes', unite: 'kg', quantite: '', source: '' },
    { designation: 'Procédés industriels hors combustion', unite: '', quantite: '', source: '' },
    { designation: 'Matières premières utilisées', unite: 't', quantite: '', source: '' },
    { designation: 'Montant achats biens/services', unite: 'TND', quantite: '', source: '' },
    { designation: 'Déplacements pro en voiture', unite: 'Trajets', quantite: '', source: '' },
    { designation: 'Déplacements pro en train', unite: 'Trajets', quantite: '', source: '' },
    { designation: 'Déplacements pro en avion', unite: 'Trajets', quantite: '', source: '' },
    { designation: 'Distance moyenne déplacements pro', unite: 'km', quantite: '', source: '' },
    { designation: 'Mode transport domicile-travail', unite: '', quantite: '', source: '' },
    { designation: 'Distance moyenne domicile-travail', unite: 'km', quantite: '', source: '' },
    { designation: 'Fréquence trajets domicile-travail', unite: 'jours/semaine', quantite: '', source: '' },
    { designation: 'Volume marchandises expédiées', unite: 't', quantite: '', source: '' },
    { designation: 'Modes de transport logistique', unite: '', quantite: '', source: '' },
    { designation: 'Distance moyenne marchandises', unite: 'km', quantite: '', source: '' },
    { designation: 'Déchets générés', unite: 't', quantite: '', source: '' },
    { designation: 'Types de déchets produits', unite: '', quantite: '', source: '' },
    { designation: 'Filières traitement/recyclage déchets', unite: '', quantite: '', source: '' },
    { designation: 'Émissions usage produits', unite: 'Oui/Non', quantite: '', source: '' },
    { designation: 'Traitement fin de vie des produits', unite: '', quantite: '', source: '' },
    { designation: 'Pourcentage produits recyclés', unite: '%', quantite: '', source: '' }
  ];

  worksheet.addRows(data);

  // Générer le fichier Excel
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const uploadExcelToSupabase = async (blob: Blob): Promise<string | null> => {
  try {
    const fileName = `tableau-collecte-donnees-${Date.now()}.xlsx`;
    
    const { data, error } = await supabase.storage
      .from('data-collection')
      .upload(fileName, blob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });

    if (error) {
      console.error('Erreur lors de l\'upload:', error);
      return null;
    }

    // Obtenir l'URL publique
    const { data: publicData } = supabase.storage
      .from('data-collection')
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    return null;
  }
};
