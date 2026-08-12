import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Database, Package, FileSpreadsheet, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PricingSolutionsPresentation: React.FC = () => {
  const { t } = useTranslation();

  const solutions = [
    {
      id: 'bilan-carbone',
      name: t('pricing.modular.solutions.bilanCarbone.name'),
      price: '2 900 DT HT',
      description: t('pricing.modular.solutions.bilanCarbone.description'),
      icon: CheckCircle2,
      required: true,
    },
    {
      id: 'collect',
      name: t('pricing.modular.solutions.collect.name'),
      price: '1 500 DT HT',
      description: t('pricing.modular.solutions.collect.description'),
      icon: Database,
      required: false,
    },
    {
      id: 'empreinte-produit',
      name: t('pricing.modular.solutions.empreinteProduit.name'),
      price: '1 500 DT HT',
      description: t('pricing.modular.solutions.empreinteProduit.description'),
      icon: Package,
      required: false,
    },
    {
      id: 'cbam',
      name: t('pricing.modular.solutions.cbam.name'),
      price: '1 500 DT HT',
      description: t('pricing.modular.solutions.cbam.description'),
      icon: FileSpreadsheet,
      required: false,
    },
    {
      id: 'monitoring',
      name: t('pricing.modular.solutions.monitoring.name'),
      price: '1 500 DT HT',
      description: t('pricing.modular.solutions.monitoring.description'),
      icon: TrendingDown,
      required: false,
    },
  ];

  return (
    <section className="py-16 bg-[#F5F7F9]">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#003B73] mb-4">
            {t('pricing.modular.solutions.title')}
          </h2>
        </div>

        <div className="space-y-6">
          {solutions.map((solution) => {
            const Icon = solution.icon;
            return (
              <Card
                key={solution.id}
                className={`border-2 ${
                  solution.required
                    ? 'border-[#00B8C9] bg-white'
                    : 'border-gray-200 bg-white hover:border-[#00B8C9] transition-colors'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        solution.required
                          ? 'bg-[#00B8C9]/20'
                          : 'bg-[#003B73]/10'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          solution.required ? 'text-[#00B8C9]' : 'text-[#003B73]'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#003B73] mb-1">
                        {solution.name}
                        {solution.required && (
                          <span className="ml-2 text-sm font-normal text-[#00B8C9]">
                            ({t('pricing.modular.solutions.required')})
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {solution.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

