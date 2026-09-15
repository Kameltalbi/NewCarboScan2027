import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SafeHtml } from '@/components/SafeHtml';

const AI_AVATAR_SRC = aiInsightAvatar;

interface AiInsightCardProps {
  totalEmissions: number;
  referenceYear: number;
  evolutionPercent?: number;
  topCategory?: { name: string; percentage: number };
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  totalEmissions,
  referenceYear,
  evolutionPercent,
  topCategory,
}) => {
  const navigate = useNavigate();

  const evoLine = (() => {
    if (evolutionPercent === undefined || !isFinite(evolutionPercent)) {
      return `Votre empreinte ${referenceYear} s'élève à ${totalEmissions.toFixed(1)} tCO₂e.`;
    }
    const abs = Math.abs(evolutionPercent).toFixed(1);
    if (evolutionPercent < 0) {
      return `Vos émissions ont diminué de ${abs}% par rapport à ${referenceYear - 1}. Bonne dynamique !`;
    }
    if (evolutionPercent > 0) {
      return `Vos émissions ont augmenté de ${abs}% par rapport à ${referenceYear - 1}. Vigilance requise.`;
    }
    return `Vos émissions sont stables par rapport à ${referenceYear - 1}.`;
  })();

  const catLine = topCategory
    ? `La catégorie « ${topCategory.name} » représente ${topCategory.percentage.toFixed(0)}% de vos émissions.`
    : null;

  return (
    <div className="relative bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 overflow-hidden">
      <div className="flex items-start gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#0E7C66]" />
        <h3 className="font-semibold text-[#0F172A] text-lg">Insight IA</h3>
      </div>

      <div className="flex items-start gap-6">
        <div className="flex-1 space-y-3 text-sm text-[#334155] leading-relaxed max-w-2xl">
          <SafeHtml html={evoLine.replace(/(\d+[.,]?\d*%)/, '<strong>$1</strong>')} />
          {catLine && (
            <SafeHtml html={catLine.replace(/(\d+%)/, '<strong>$1</strong>')} />
          )}
          <p>
            Nous recommandons d'analyser vos postes prioritaires pour identifier
            des leviers de réduction.
          </p>

          <button
            onClick={() => navigate('/app/plan-actions')}
            className="inline-flex items-center gap-1.5 text-[#0E7C66] font-semibold hover:underline mt-2"
          >
            Voir les recommandations
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden md:block flex-shrink-0">
          <img
            src={AI_AVATAR_SRC}
            alt="CarboScan AI"
            className="w-32 h-32 object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};
