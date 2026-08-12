// Utilitaires d'export pour le module Empreinte Produit
import html2pdf from 'html2pdf.js';

export interface ProductFootprintExportData {
  product: {
    name: string;
    category: string;
    functionalUnit: string;
    description?: string;
  };
  result: {
    totalEmissions: number;
    breakdown: Array<{
      phase: string;
      emissions: number;
      percentage: number;
      isEstimated: boolean;
    }>;
    dominantPhase: string;
    dataQuality: {
      realData: number;
      estimatedData: number;
    };
    methodology: string;
  };
}

const PHASE_LABELS: Record<string, string> = {
  materials: 'Matières premières',
  manufacturing: 'Fabrication',
  transport: 'Transport',
  usage: 'Utilisation',
  endOfLife: 'Fin de vie',
};

/**
 * Générer le contenu HTML pour le PDF
 */
const generatePDFContent = (data: ProductFootprintExportData): string => {
  const { product, result } = data;
  const date = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let content = `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6; padding: 20px;">
      <!-- Page de garde -->
      <div style="text-align: center; margin-bottom: 60px; page-break-after: always;">
        <h1 style="color: #1ABC9C; font-size: 32px; margin-bottom: 20px; font-weight: bold;">
          Rapport d'Empreinte Carbone Produit
        </h1>
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 40px;">${product.name}</h2>
        <div style="border: 2px solid #1ABC9C; padding: 30px; margin: 40px auto; max-width: 500px; border-radius: 8px;">
          <div style="font-size: 48px; font-weight: bold; color: #1ABC9C; margin-bottom: 10px;">
            ${result.totalEmissions.toFixed(2)}
          </div>
          <div style="font-size: 18px; color: #6B7280; margin-bottom: 20px;">
            kg CO₂e / ${product.functionalUnit}
          </div>
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 20px;">
            <p style="margin: 8px 0; color: #374151;"><strong>Catégorie:</strong> ${product.category}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Date de génération:</strong> ${date}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Phase dominante:</strong> ${PHASE_LABELS[result.dominantPhase] || result.dominantPhase}</p>
          </div>
        </div>
        ${product.description ? `<p style="color: #6B7280; margin-top: 40px; max-width: 600px; margin-left: auto; margin-right: auto;">${product.description}</p>` : ''}
      </div>

      <!-- Résumé exécutif -->
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Résumé exécutif
        </h2>
        <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; border-left: 4px solid #1ABC9C; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px; line-height: 1.8;">
            L'empreinte carbone totale de <strong>${product.name}</strong> est de 
            <strong style="color: #1ABC9C;"> ${result.totalEmissions.toFixed(2)} kg CO₂e</strong> 
            par ${product.functionalUnit}.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
          <div style="background: #F9FAFB; padding: 15px; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Données réelles</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #059669;">${result.dataQuality.realData.toFixed(0)}%</p>
          </div>
          <div style="background: #F9FAFB; padding: 15px; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Données estimées</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #F59E0B;">${result.dataQuality.estimatedData.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      <!-- Répartition par phase -->
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Répartition par phase du cycle de vie
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
              <th style="text-align: left; padding: 12px; font-weight: 600; color: #374151;">Phase</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Émissions (kg CO₂e)</th>
              <th style="text-align: right; padding: 12px; font-weight: 600; color: #374151;">Pourcentage</th>
              <th style="text-align: center; padding: 12px; font-weight: 600; color: #374151;">Type</th>
            </tr>
          </thead>
          <tbody>
  `;

  const colors = ['#1ABC9C', '#0F172A', '#86EFAC', '#F59E0B', '#EF4444'];
  result.breakdown.forEach((item, index) => {
    const phaseLabel = PHASE_LABELS[item.phase] || item.phase;
    const color = colors[index % colors.length];
    content += `
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
                  <span style="font-weight: 500;">${phaseLabel}</span>
                </div>
              </td>
              <td style="text-align: right; padding: 12px; font-weight: 600;">${item.emissions.toFixed(2)}</td>
              <td style="text-align: right; padding: 12px; color: #6B7280;">${item.percentage.toFixed(1)}%</td>
              <td style="text-align: center; padding: 12px;">
                ${item.isEstimated 
                  ? '<span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Estimé</span>'
                  : '<span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Réel</span>'
                }
              </td>
            </tr>
    `;
  });

  content += `
          </tbody>
          <tfoot>
            <tr style="background: #F9FAFB; font-weight: bold; border-top: 2px solid #1ABC9C;">
              <td style="padding: 12px;">Total</td>
              <td style="text-align: right; padding: 12px; color: #1ABC9C; font-size: 18px;">${result.totalEmissions.toFixed(2)}</td>
              <td style="text-align: right; padding: 12px;">100%</td>
              <td style="padding: 12px;"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Méthodologie et qualité -->
      <div style="page-break-after: always;">
        <h2 style="color: #1ABC9C; border-bottom: 2px solid #1ABC9C; padding-bottom: 10px; margin-bottom: 20px;">
          Méthodologie et qualité des données
        </h2>
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-bottom: 10px; font-size: 16px;">Méthodologie utilisée</h3>
          <p style="margin: 0; color: #6B7280; line-height: 1.8;">${result.methodology}</p>
        </div>
        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <h3 style="color: #92400E; margin-bottom: 10px; font-size: 16px;">⚠️ Note importante</h3>
          <p style="margin: 0; color: #78350F; line-height: 1.8;">
            Ce calcul utilise une méthodologie simplifiée basée sur des facteurs d'émission moyens. 
            Pour une analyse plus précise, notamment pour la communication externe, nous recommandons 
            de réaliser une Analyse du Cycle de Vie (ACV) complète conforme aux normes ISO 14040/14044.
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
 * Générer et télécharger le PDF de l'empreinte produit
 */
export const generateProductFootprintPDF = async (
  data: ProductFootprintExportData
): Promise<void> => {
  try {
    // Créer le contenu HTML pour le PDF
    const htmlContent = generatePDFContent(data);

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
      filename: `empreinte-produit-${data.product.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`,
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
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};

