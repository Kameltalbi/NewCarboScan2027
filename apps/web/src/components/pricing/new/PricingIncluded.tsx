import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PricingIncluded: React.FC = () => {
  const { t } = useTranslation();
  const includedItems = t('newPricing.included.items', { returnObjects: true }) as string[];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('newPricing.included.title')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('newPricing.included.subtitle')}
          </p>
        </div>

        <Card className="border-2 border-[#009879]">
          <CardContent className="pt-8 pb-8 px-8">
            <ul className="space-y-4">
              {includedItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-[#009879] rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <span className="text-lg text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

