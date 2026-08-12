import ExcelJS from 'exceljs';
import html2pdf from 'html2pdf.js';
import { supabase } from "@/integrations/api/client";
import { calculateProjectImpacts } from './acvCalculations';

interface ACVExportOptions {
  includeObjective: boolean;
  includeInventory: boolean;
  includeResults: boolean;
  includeInterpretation: boolean;
  includeComparison: boolean;
  includeGraphs: boolean;
  includeSourceData: boolean;
}

export const generateACVPDF = async (projectId: string, options: ACVExportOptions) => {
  try {
    // Récupérer les données du projet
    const { data: project, error: projectError } = await supabase
      .from('acv_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) throw new Error('Projet non trouvé');

    // Récupérer l'inventaire
    const { data: inventory, error: inventoryError } = await supabase
      .from('acv_inventory')
      .select('*')
      .eq('project_id', projectId);

    if (inventoryError) throw new Error('Erreur lors de la récupération de l\'inventaire');

    // Calculer les impacts
    const calculatedImpacts = await calculateProjectImpacts(projectId);

    // Créer le contenu HTML pour le PDF
    const htmlContent = generatePDFContent(project, inventory || [], calculatedImpacts, options);

    // Créer un élément temporaire pour html2pdf
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    // Configuration pour html2pdf
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `rapport-acv-${project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    // Générer et télécharger le PDF
    await html2pdf().set(opt).from(tempDiv).save();

    // Nettoyer l'élément temporaire
    document.body.removeChild(tempDiv);

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};

export const generateACVExcel = async (projectId: string, options: ACVExportOptions) => {
  try {
    // Récupérer les données du projet
    const { data: project, error: projectError } = await supabase
      .from('acv_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) throw new Error('Projet non trouvé');

    // Récupérer l'inventaire
    const { data: inventory, error: inventoryError } = await supabase
      .from('acv_inventory')
      .select('*')
      .eq('project_id', projectId);

    if (inventoryError) throw new Error('Erreur lors de la récupération de l\'inventaire');

    // Récupérer les facteurs d'impact
    const { data: impactFactors, error: factorsError } = await supabase
      .from('impact_factors')
      .select('*');

    if (factorsError) throw new Error('Erreur lors de la récupération des facteurs d\'impact');

    // Calculer les impacts
    const calculatedImpacts = await calculateProjectImpacts(projectId);

    // Créer le workbook Excel
    const workbook = new ExcelJS.Workbook();

    // Feuille 1: Informations du projet
    if (options.includeObjective) {
      const projectSheet = workbook.addWorksheet('Informations Projet');
      
      projectSheet.columns = [
        { header: 'Propriété', key: 'property', width: 25 },
        { header: 'Valeur', key: 'value', width: 50 }
      ];

      const projectData = [
        { property: 'Nom du projet', value: project.name },
        { property: 'Description', value: project.description || '' },
        { property: 'Objectif de l\'étude', value: project.goal_definition },
        { property: 'Champ d\'étude', value: project.scope_definition },
        { property: 'Unité fonctionnelle', value: project.functional_unit },
        { property: 'Frontières du système', value: project.system_boundaries || '' },
        { property: 'Statut', value: project.status },
        { property: 'Date de création', value: new Date(project.created_at).toLocaleDateString('fr-FR') },
        { property: 'Dernière mise à jour', value: new Date(project.updated_at).toLocaleDateString('fr-FR') }
      ];

      projectSheet.addRows(projectData);
    }

    // Feuille 2: Inventaire
    if (options.includeInventory && inventory) {
      const inventorySheet = workbook.addWorksheet('Inventaire');
      
      inventorySheet.columns = [
        { header: 'Item', key: 'item', width: 20 },
        { header: 'Catégorie', key: 'category', width: 15 },
        { header: 'Quantité', key: 'quantity', width: 12 },
        { header: 'Unité', key: 'unit', width: 10 },
        { header: 'Phase', key: 'phase', width: 15 },
        { header: 'Source des données', key: 'data_source', width: 20 },
        { header: 'Qualité des données', key: 'data_quality', width: 15 },
        { header: 'Pays fournisseur', key: 'supplier_country', width: 15 },
        { header: 'Pourcentage recyclé', key: 'recycled_percentage', width: 15 }
      ];

      const inventoryData = inventory.map(item => ({
        item: item.item,
        category: item.category,
        quantity: item.quantity.toString(),
        unit: item.unit,
        phase: item.phase || '',
        data_source: item.data_source || '',
        data_quality: (item.data_quality || '').toString(),
        supplier_country: item.supplier_country || '',
        recycled_percentage: (item.recycled_percentage || 0).toString()
      }));

      inventorySheet.addRows(inventoryData);
    }

    // Feuille 3: Résultats d'impacts
    if (options.includeResults && calculatedImpacts.calculatedImpacts && calculatedImpacts.calculatedImpacts.length > 0) {
      const resultsSheet = workbook.addWorksheet('Résultats Impact');
      
      resultsSheet.columns = [
        { header: 'Item', key: 'item', width: 20 },
        { header: 'Catégorie', key: 'category', width: 15 },
        { header: 'Quantité', key: 'quantity', width: 12 },
        { header: 'Unité', key: 'unit', width: 10 },
        { header: 'Changement climatique (kg CO2 eq)', key: 'climate', width: 25 },
        { header: 'Acidification (kg SO2 eq)', key: 'acidification', width: 20 },
        { header: 'Consommation d\'eau (m³)', key: 'water', width: 20 }
      ];

      const resultsData = calculatedImpacts.calculatedImpacts.map((impact: any) => ({
        item: impact.item,
        category: impact.category,
        quantity: impact.quantity.toString(),
        unit: impact.unit,
        climate: impact.climate.toString(),
        acidification: impact.acidification.toString(),
        water: impact.water.toString()
      }));

      resultsSheet.addRows(resultsData);

      // Ajouter les totaux
      resultsSheet.addRow({});
      resultsSheet.addRow({
        item: 'TOTAUX',
        category: '',
        quantity: '',
        unit: '',
        climate: (calculatedImpacts.summary?.climate.value || 0).toString(),
        acidification: (calculatedImpacts.summary?.acidification.value || 0).toString(),
        water: (calculatedImpacts.summary?.water.value || 0).toString()
      });
    }

    // Feuille 4: Facteurs d'impact (si demandé)
    if (options.includeSourceData && impactFactors) {
      const factorsSheet = workbook.addWorksheet('Facteurs Impact');
      
      factorsSheet.columns = [
        { header: 'Item', key: 'item', width: 20 },
        { header: 'Unité', key: 'unit', width: 10 },
        { header: 'Catégorie', key: 'category', width: 15 },
        { header: 'Changement climatique (kg CO2 eq)', key: 'climate_co2e', width: 25 },
        { header: 'Acidification (kg SO2 eq)', key: 'acidification_so2e', width: 20 },
        { header: 'Consommation d\'eau (m³)', key: 'water_m3', width: 20 }
      ];

      const factorsData = impactFactors.map(factor => ({
        item: factor.item,
        unit: factor.unit,
        category: factor.category,
        climate_co2e: (factor.climate_co2e || 0).toString(),
        acidification_so2e: (factor.acidification_so2e || 0).toString(),
        water_m3: (factor.water_m3 || 0).toString()
      }));

      factorsSheet.addRows(factorsData);
    }

    // Générer le fichier Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    // Télécharger le fichier
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-acv-${project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel:', error);
    throw error;
  }
};

const generatePDFContent = (project: any, inventory: any[], calculatedImpacts: any, options: ACVExportOptions): string => {
  let content = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px;">
      <!-- Page de garde -->
      <div style="text-align: center; margin-bottom: 60px; page-break-after: always;">
        <h1 style="color: #2563eb; font-size: 32px; margin-bottom: 20px;">Rapport d'Analyse de Cycle de Vie</h1>
        <h2 style="color: #666; font-size: 24px; margin-bottom: 40px;">${project.name}</h2>
        <div style="border: 2px solid #2563eb; padding: 30px; margin: 40px auto; max-width: 400px;">
          <p style="margin: 10px 0;"><strong>Date de génération:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <p style="margin: 10px 0;"><strong>Statut:</strong> ${project.status}</p>
          <p style="margin: 10px 0;"><strong>Unité fonctionnelle:</strong> ${project.functional_unit}</p>
        </div>
        <p style="color: #666; margin-top: 60px;">Conforme aux normes ISO 14040 et ISO 14044</p>
      </div>
  `;

  // Table des matières
  content += `
    <div style="page-break-after: always;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Table des matières</h2>
      <ul style="list-style: none; padding: 0;">
  `;
  
  if (options.includeObjective) content += '<li style="margin: 10px 0;">1. Objectif et champ d\'étude</li>';
  if (options.includeInventory) content += '<li style="margin: 10px 0;">2. Inventaire des flux</li>';
  if (options.includeResults) content += '<li style="margin: 10px 0;">3. Évaluation des impacts</li>';
  if (options.includeInterpretation) content += '<li style="margin: 10px 0;">4. Interprétation</li>';
  
  content += '</ul></div>';

  // Section 1: Objectif et champ d'étude
  if (options.includeObjective) {
    content += `
      <div style="page-break-before: always;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">1. Objectif et champ d'étude</h2>
        
        <h3 style="color: #374151;">1.1 Objectif de l'étude</h3>
        <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #2563eb;">${project.goal_definition}</p>
        
        <h3 style="color: #374151;">1.2 Champ d'étude</h3>
        <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #2563eb;">${project.scope_definition}</p>
        
        <h3 style="color: #374151;">1.3 Unité fonctionnelle</h3>
        <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #2563eb;">${project.functional_unit}</p>
        
        ${project.system_boundaries ? `
          <h3 style="color: #374151;">1.4 Frontières du système</h3>
          <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #2563eb;">${project.system_boundaries}</p>
        ` : ''}
      </div>
    `;
  }

  // Section 2: Inventaire
  if (options.includeInventory && inventory.length > 0) {
    content += `
      <div style="page-break-before: always;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">2. Inventaire des flux</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Item</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Catégorie</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Quantité</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Unité</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Phase</th>
            </tr>
          </thead>
          <tbody>
    `;

    inventory.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
      content += `
        <tr style="background: ${bgColor};">
          <td style="border: 1px solid #ddd; padding: 10px;">${item.item}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${item.category}</td>
          <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${item.quantity}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${item.unit}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${item.phase || 'Production'}</td>
        </tr>
      `;
    });

    content += '</tbody></table></div>';
  }

  // Section 3: Résultats
  if (options.includeResults && calculatedImpacts.summary) {
    content += `
      <div style="page-break-before: always;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">3. Évaluation des impacts</h2>
        
        <h3 style="color: #374151;">3.1 Résultats par catégorie d'impact</h3>
        
        <div style="display: grid; gap: 20px; margin: 20px 0;">
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">Changement climatique</h4>
            <p style="font-size: 24px; font-weight: bold; color: #92400e; margin: 0;">
              ${(calculatedImpacts.summary.climate.value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${calculatedImpacts.summary.climate.unit}
            </p>
          </div>
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0;">Acidification</h4>
            <p style="font-size: 24px; font-weight: bold; color: #1e40af; margin: 0;">
              ${(calculatedImpacts.summary.acidification.value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${calculatedImpacts.summary.acidification.unit}
            </p>
          </div>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <h4 style="color: #065f46; margin: 0 0 10px 0;">Consommation d'eau</h4>
            <p style="font-size: 24px; font-weight: bold; color: #065f46; margin: 0;">
              ${(calculatedImpacts.summary.water.value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${calculatedImpacts.summary.water.unit}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Section 4: Interprétation
  if (options.includeInterpretation) {
    content += `
      <div style="page-break-before: always;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">4. Interprétation</h2>
        
        <h3 style="color: #374151;">4.1 Analyse des résultats</h3>
        <p>Cette section présente l'interprétation des résultats obtenus lors de l'analyse de cycle de vie.</p>
        
        <h3 style="color: #374151;">4.2 Points sensibles identifiés</h3>
        <p>Les principaux contributeurs aux impacts environnementaux sont identifiés dans cette section.</p>
        
        <h3 style="color: #374151;">4.3 Limitations de l'étude</h3>
        <p>Cette section décrit les limitations et incertitudes de l'étude réalisée.</p>
        
        <h3 style="color: #374151;">4.4 Recommandations</h3>
        <p>Des recommandations pour l'amélioration de la performance environnementale sont présentées ici.</p>
      </div>
    `;
  }

  content += '</div>';
  return content;
};