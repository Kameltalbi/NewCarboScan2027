import React from 'react';
import { Database, TrendingDown, Package, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PricingIntroduction: React.FC = () => {
  const { t } = useTranslation();

  const modules = [
    {
      id: 'collect',
      name: t('pricing.modular.introduction.modules.collect.name'),
      description: t('pricing.modular.introduction.modules.collect.description'),
      icon: Database,
    },
    {
      id: 'monitoring',
      name: t('pricing.modular.introduction.modules.monitoring.name'),
      description: t('pricing.modular.introduction.modules.monitoring.description'),
      icon: TrendingDown,
    },
    {
      id: 'empreinte-produit',
      name: t('pricing.modular.introduction.modules.empreinteProduit.name'),
      description: t('pricing.modular.introduction.modules.empreinteProduit.description'),
      icon: Package,
    },
    {
      id: 'cbam',
      name: t('pricing.modular.introduction.modules.cbam.name'),
      description: t('pricing.modular.introduction.modules.cbam.description'),
      icon: FileSpreadsheet,
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="w-full px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Texte principal */}
          <div className="mb-8">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
              {t('pricing.modular.introduction.mainText')}
            </p>
            <div className="flex items-start gap-3 p-4 bg-[#009879]/10 rounded-lg border border-[#009879]/20">
              <CheckCircle2 className="h-6 w-6 text-[#009879] flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 font-medium">
                {t('pricing.modular.introduction.baseText')}
              </p>
            </div>
          </div>

          {/* Liste des modules */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-[#009879] mb-6">
              {t('pricing.modular.introduction.modulesTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-[#009879]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-[#009879]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#009879] mb-1">
                        {module.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {module.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conclusion */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-base text-gray-700 leading-relaxed text-center">
              {t('pricing.modular.introduction.conclusion')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

