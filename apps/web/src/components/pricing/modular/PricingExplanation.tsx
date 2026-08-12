import React from 'react';
import { Info, Building2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PricingExplanation: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="h-full">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-[#009879]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Info className="h-6 w-6 text-[#009879]" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[#009879] mb-4">
            {t('pricing.modular.explanation.title')}
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            {t('pricing.modular.explanation.intro')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-[#009879]/5 rounded-lg">
          <Building2 className="h-5 w-5 text-[#009879] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-700">
              <strong className="text-[#009879]">{t('pricing.modular.explanation.priceStart')}</strong>{' '}
              {t('pricing.modular.explanation.priceStartDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[#009879]/5 rounded-lg">
          <Users className="h-5 w-5 text-[#009879] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-700">
              <strong className="text-[#009879]">{t('pricing.modular.explanation.perimeter')}</strong>{' '}
              {t('pricing.modular.explanation.perimeterDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

