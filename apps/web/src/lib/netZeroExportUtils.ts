// Utilitaires d'export PDF pour le module Trajectoire Net Zéro
import html2pdf from 'html2pdf.js';
import { NetZeroTrajectory } from './net-zero/types';

/**
 * Générer le contenu HTML pour le PDF Net Zero
 */
const generateNetZeroPDFContent = (trajectory: NetZeroTrajectory): string => {
  const date = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const reference = trajectory.reference;
  const netZeroObjective = trajectory.objectives.find((o) => o.horizon === 'net-zero') || trajectory.objectives[0];
  const currentYear = new Date().getFullYear();

  let content = `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6; padding: 20px;">
      <!-- Page de garde -->
      <div style="text-align: center; margin-bottom: 60px; page-break-after: always;">
        <h1 style="color: #1ABC9C; font-size: 32px; margin-bottom: 20px; font-weight: bold;">
          Trajectoire Net Zéro
        </h1>
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 40px;">
          Alignée avec les recommandations SBTi
        </h2>
        <div style="border: 2px solid #1ABC9C; padding: 30px; margin: 40px auto; max-width: 500px; border-radius: 8px;">
          <div style="font-size: 36px; font-weight: bold; color: #1ABC9C; margin-bottom: 10px;">
            ${reference.reference_year} → ${netZeroObjective?.target_year || '2050'}
          </div>
          <div style="font-size: 18px; color: #6B7280; margin-bottom: 20px;">
            Réduction de ${netZeroObjective?.target_reduction_percent || 0}%
          </div>
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 20px;">
            <p style="margin: 8px 0; color: #374151;"><strong>Année de référence:</strong> ${reference.reference_year}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Émissions de référence:</strong> ${Math.round(reference.reference_emissions)} tCO₂e</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Scopes inclus:</strong> ${reference.scopes_included}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Méthode:</strong> ${reference.calculation_method}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Date de génération:</strong> ${date}</p>
          </div>
        </div>
      </div>

      <!-- Résumé exécutif -->
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Résumé exécutif
        </h2>
        <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; border-left: 4px solid #1ABC9C; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px; line-height: 1.8;">
            Cette trajectoire Net Zéro vise une réduction de <strong style="color: #1ABC9C;">${netZeroObjective?.target_reduction_percent || 0}%</strong> 
            des émissions entre ${reference.reference_year} et ${netZeroObjective?.target_year || '2050'}, 
            passant de <strong>${Math.round(reference.reference_emissions)} tCO₂e</strong> à 
            <strong>${Math.round(reference.reference_emissions * (1 - (netZeroObjective?.target_reduction_percent || 0) / 100))} tCO₂e</strong>.
          </p>
        </div>
        ${trajectory.objectives.length > 0 ? `
          <h3 style="color: #374151; margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Objectifs définis</h3>
          <div style="display: grid; gap: 15px;">
        ` : ''}
  `;

  trajectory.objectives.forEach((obj) => {
    content += `
            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid #1ABC9C;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #374151;">
                  ${obj.horizon === 'net-zero' ? 'Net Zero' : 'Court terme'} (${obj.target_year})
                </span>
                <span style="font-size: 20px; font-weight: bold; color: #1ABC9C;">-${obj.target_reduction_percent}%</span>
              </div>
              <p style="margin: 0; color: #6B7280; font-size: 14px;">
                Type: ${obj.type === 'absolute' ? 'Réduction absolue' : 'Réduction d\'intensité'}
                ${obj.intensity_metric ? ` • Métrique: ${obj.intensity_metric}` : ''}
              </p>
            </div>
    `;
  });

  if (trajectory.objectives.length > 0) {
    content += `</div>`;
  }

  content += `
      </div>

      <!-- Trajectoire annuelle -->
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Trajectoire annuelle
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
              <th style="text-align: left; padding: 12px; font-weight: 600; color: #374151;">Année</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Cible (tCO₂e)</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Réduction vs référence</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Afficher les années clés (tous les 5 ans + années importantes)
  const keyYears = trajectory.base_trajectory.filter(
    (point) => 
      point.year % 5 === 0 || 
      point.year === reference.reference_year || 
      point.year === netZeroObjective?.target_year ||
      point.year === currentYear
  );

  keyYears.forEach((point) => {
    const isCurrentYear = point.year === currentYear;
    const isReferenceYear = point.year === reference.reference_year;
    const isTargetYear = point.year === netZeroObjective?.target_year;
    
    content += `
            <tr style="border-bottom: 1px solid #E5E7EB; ${isCurrentYear ? 'background: #FEF3C7;' : ''}">
              <td style="padding: 12px;">
                ${point.year}
                ${isReferenceYear ? ' <span style="color: #6B7280; font-size: 12px;">(référence)</span>' : ''}
                ${isTargetYear ? ' <span style="color: #1ABC9C; font-size: 12px;">(cible)</span>' : ''}
                ${isCurrentYear ? ' <span style="color: #F59E0B; font-size: 12px;">(actuelle)</span>' : ''}
              </td>
              <td style="text-align: right; padding: 12px; font-weight: ${isTargetYear ? 'bold' : 'normal'}; color: ${isTargetYear ? '#1ABC9C' : '#374151'};">
                ${Math.round(point.target_emissions)}
              </td>
              <td style="text-align: right; padding: 12px; color: #6B7280;">
                ${Math.round(point.reduction_percent)}%
              </td>
            </tr>
    `;
  });

  content += `
          </tbody>
        </table>
      </div>

      <!-- Leviers de réduction -->
  `;

  if (trajectory.levers.length > 0) {
    content += `
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Leviers de réduction identifiés
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
              <th style="text-align: left; padding: 12px; font-weight: 600; color: #374151;">Levier</th>
              <th style="text-align: left; padding: 12px; font-weight: 600; color: #374151;">Catégorie</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Impact (tCO₂e/an)</th>
              <th style="text-align: center; padding: 12px; font-weight: 600; color: #374151;">Période</th>
            </tr>
          </thead>
          <tbody>
    `;

    trajectory.levers.forEach((lever) => {
      const categoryLabels: Record<string, string> = {
        energy: 'Énergie',
        transport: 'Transport',
        purchases: 'Achats',
        products: 'Produits',
        organization: 'Organisation',
        waste: 'Déchets',
        other: 'Autre',
      };

      content += `
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 12px; font-weight: 500;">${lever.name}</td>
              <td style="padding: 12px; color: #6B7280;">${categoryLabels[lever.category] || lever.category}</td>
              <td style="text-align: right; padding: 12px; font-weight: 600; color: #059669;">
                -${Math.round(lever.estimated_impact)}
              </td>
              <td style="text-align: center; padding: 12px; color: #6B7280;">
                ${lever.start_year} - ${lever.end_year}
              </td>
            </tr>
      `;
    });

    content += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Scénarios
  if (trajectory.scenarios.length > 0) {
    content += `
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Scénarios simulés
        </h2>
    `;

    trajectory.scenarios.forEach((scenario) => {
      const scenarioTypeLabels: Record<string, string> = {
        conservative: 'Conservateur',
        ambitious: 'Ambitieux',
        accelerated: 'Accéléré',
      };

      content += `
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #1ABC9C;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #374151; font-size: 18px;">${scenario.name}</h3>
            <span style="background: #D1FAE5; color: #065F46; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
              ${scenarioTypeLabels[scenario.type] || scenario.type}
            </span>
          </div>
          <p style="margin: 8px 0; color: #6B7280;">
            Réduction totale: <strong style="color: #059669;">-${Math.round(scenario.total_reduction)} tCO₂e</strong>
          </p>
          <p style="margin: 8px 0; color: #6B7280;">
            Score de faisabilité: <strong>${scenario.feasibility_score}/100</strong>
          </p>
          <p style="margin: 8px 0; color: #6B7280; font-size: 14px;">
            Leviers activés: ${scenario.levers_enabled.length}
          </p>
        </div>
      `;
    });

    content += `</div>`;
  }

  // Suivi annuel
  if (trajectory.annual_tracking.length > 0) {
    content += `
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Suivi annuel
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
              <th style="text-align: left; padding: 12px; font-weight: 600; color: #374151;">Année</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Réel (tCO₂e)</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Cible (tCO₂e)</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Écart</th>
              <th style="text-align: center; padding: 12px; font-weight: 600; color: #374151;">Statut</th>
            </tr>
          </thead>
          <tbody>
    `;

    trajectory.annual_tracking.forEach((tracking) => {
      const statusLabels: Record<string, { label: string; color: string }> = {
        achieved: { label: 'Atteint', color: '#059669' },
        'on-track': { label: 'Sur la bonne voie', color: '#2563EB' },
        'at-risk': { label: 'À risque', color: '#DC2626' },
        planned: { label: 'Planifié', color: '#6B7280' },
      };

      const status = statusLabels[tracking.status] || statusLabels.planned;

      content += `
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 12px; font-weight: 500;">${tracking.year}</td>
              <td style="text-align: right; padding: 12px;">${Math.round(tracking.actual_emissions)}</td>
              <td style="text-align: right; padding: 12px;">${Math.round(tracking.target_emissions)}</td>
              <td style="text-align: right; padding: 12px; color: ${tracking.gap > 0 ? '#DC2626' : '#059669'};">
                ${tracking.gap > 0 ? '+' : ''}${Math.round(tracking.gap)}
              </td>
              <td style="text-align: center; padding: 12px;">
                <span style="background: ${status.color}20; color: ${status.color}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${status.label}
                </span>
              </td>
            </tr>
      `;
    });

    content += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Mention légale SBTi
  content += `
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Mentions légales
        </h2>
        <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; border-left: 4px solid #2563EB;">
          <h3 style="color: #1E40AF; margin-bottom: 10px; font-size: 16px;">⚠️ Note importante</h3>
          <p style="margin: 0; color: #1E3A8A; line-height: 1.8;">
            Cette trajectoire est alignée avec les recommandations de la Science Based Targets initiative (SBTi). 
            La validation officielle des objectifs reste du ressort de la SBTi.
          </p>
        </div>
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #374151; margin-bottom: 10px; font-size: 16px;">Méthodologie</h3>
          <p style="margin: 0; color: #6B7280; line-height: 1.8;">
            Méthode de calcul: <strong>${reference.calculation_method}</strong><br>
            Scopes inclus: <strong>${reference.scopes_included}</strong><br>
            Année de référence: <strong>${reference.reference_year}</strong><br>
            Émissions de référence: <strong>${Math.round(reference.reference_emissions)} tCO₂e</strong>
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px;">
        <p style="margin: 5px 0;">Rapport généré par CarboScan</p>
        <p style="margin: 5px 0;">${date}</p>
        <p style="margin: 5px 0;">Ce document est confidentiel et destiné à un usage interne uniquement.</p>
      </div>
    </div>
  `;

  return content;
};

/**
 * Générer et télécharger le PDF de la trajectoire Net Zero
 */
export const generateNetZeroPDF = async (trajectory: NetZeroTrajectory): Promise<void> => {
  try {
    // Créer le contenu HTML pour le PDF
    const htmlContent = generateNetZeroPDFContent(trajectory);

    // Créer un élément temporaire pour html2pdf
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    document.body.appendChild(tempDiv);

    // Configuration pour html2pdf
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `trajectoire-net-zero-${trajectory.reference.reference_year}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: { 
        unit: 'mm' as const, 
        format: 'a4' as const, 
        orientation: 'portrait' as const,
        compress: true,
      },
    };

    // Générer et télécharger le PDF
    await html2pdf().set(opt).from(tempDiv).save();

    // Nettoyer l'élément temporaire
    document.body.removeChild(tempDiv);

    return;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF Net Zero:', error);
    throw error;
  }
};

