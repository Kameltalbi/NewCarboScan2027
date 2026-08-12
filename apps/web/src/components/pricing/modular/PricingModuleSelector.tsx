import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Database, Package, FileSpreadsheet, TrendingDown, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Module {
  id: string;
  name: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface PricingModuleSelectorProps {
  isCustomQuote: boolean;
  onRequestQuote: () => void;
}

export const PricingModuleSelector: React.FC<PricingModuleSelectorProps> = ({
  isCustomQuote,
  onRequestQuote,
}) => {
  const { t } = useTranslation();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const modules: Module[] = [
    {
      id: 'collect',
      name: t('pricing.modular.modules.collect.name'),
      price: 1500,
      icon: Database,
    },
    {
      id: 'empreinte-produit',
      name: t('pricing.modular.modules.empreinteProduit.name'),
      price: 1500,
      icon: Package,
    },
    {
      id: 'cbam',
      name: t('pricing.modular.modules.cbam.name'),
      price: 1500,
      icon: FileSpreadsheet,
    },
    {
      id: 'monitoring',
      name: t('pricing.modular.modules.monitoring.name'),
      price: 1500,
      icon: TrendingDown,
    },
  ];

  const basePrice = 2900; // Bilan Carbone Complet (obligatoire)
  const totalPrice = useMemo(() => {
    const modulesPrice = selectedModules.reduce((sum, moduleId) => {
      const module = modules.find((m) => m.id === moduleId);
      return sum + (module?.price || 0);
    }, 0);
    return basePrice + modulesPrice;
  }, [selectedModules]);

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#009879] mb-4">
            {t('pricing.modular.selector.title')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('pricing.modular.selector.subtitle')}
          </p>
        </div>

        <Card className="border-2 border-[#00B8C9]">
          <CardHeader className="bg-gradient-to-r from-[#003B73] to-[#004B87] text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">
              {t('pricing.modular.selector.cardTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Bilan Carbone (toujours inclus) */}
            <div className="mb-6 p-4 bg-[#00B8C9]/10 rounded-lg border-2 border-[#00B8C9]">
              <div className="flex items-center gap-3">
                <Checkbox checked={true} disabled className="border-[#00B8C9]" />
                <div className="flex-1">
                  <Label className="text-lg font-semibold text-[#009879] cursor-default">
                    {t('pricing.modular.selector.bilanCarbone.name')}
                  </Label>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('pricing.modular.selector.bilanCarbone.description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Modules additionnels */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-[#009879] mb-4">
                {t('pricing.modular.selector.modulesTitle')}
              </h3>
              {modules.map((module) => {
                const Icon = module.icon;
                const isSelected = selectedModules.includes(module.id);
                return (
                  <div
                    key={module.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-[#00B8C9] bg-[#00B8C9]/5'
                        : 'border-gray-200 hover:border-[#00B8C9]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleModuleToggle(module.id)}
                        className="border-[#003B73]"
                      />
                        <Icon className="h-5 w-5 text-[#009879]" />
                        <Label
                          htmlFor={module.id}
                          className="text-base font-medium text-[#009879] cursor-pointer flex-1"
                        >
                          {module.name}
                        </Label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="border-t-2 border-[#00B8C9] pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Calculator className="h-6 w-6 text-[#009879]" />
                  <span className="text-xl font-bold text-[#009879]">
                    {t('pricing.modular.selector.total')}
                  </span>
                </div>
                {isCustomQuote ? (
                  <div className="text-xl font-bold text-[#00B8C9]">
                    {t('pricing.modular.selector.customQuote')}
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-[#009879]">
                    {totalPrice.toLocaleString('fr-FR')} DT HT
                  </div>
                )}
              </div>

              <Button
                onClick={onRequestQuote}
                className="w-full bg-[#003B73] hover:bg-[#004B87] text-white py-6 text-lg font-semibold"
                size="lg"
              >
                {t('pricing.modular.selector.cta')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

