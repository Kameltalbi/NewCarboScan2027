import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Target, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PricingPhilosophy: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('newPricing.philosophy.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Point 1 */}
          <Card className="border-2 border-gray-100 hover:border-[#009879] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#009879]/10 rounded-full flex items-center justify-center">
                  <Target className="h-8 w-8 text-[#009879]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                {t('newPricing.philosophy.point1.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('newPricing.philosophy.point1.description')}
              </p>
            </CardContent>
          </Card>

          {/* Point 2 */}
          <Card className="border-2 border-gray-100 hover:border-[#009879] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#009879]/10 rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8 text-[#009879]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                {t('newPricing.philosophy.point2.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('newPricing.philosophy.point2.description')}
              </p>
            </CardContent>
          </Card>

          {/* Point 3 */}
          <Card className="border-2 border-gray-100 hover:border-[#009879] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#009879]/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-[#009879]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                {t('newPricing.philosophy.point3.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('newPricing.philosophy.point3.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Encart important */}
        <Card className="bg-gradient-to-r from-[#009879] to-[#007a63] border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center text-white">
              <p className="text-lg md:text-xl font-medium leading-relaxed">
                {t('newPricing.philosophy.highlight')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

