import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export const PricingTrust: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="py-16 bg-white border-t border-gray-200">
      <div className="container mx-auto max-w-6xl px-4">
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="pt-0">
            <div className="text-center space-y-6">
              {/* Logos de certifications (placeholder) */}
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                <div className="text-gray-400 text-sm">Certification 1</div>
                <div className="text-gray-400 text-sm">Certification 2</div>
                <div className="text-gray-400 text-sm">Partenariat</div>
              </div>

              {/* Mention de confiance */}
              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 max-w-3xl mx-auto">
                  {t('newPricing.trust.text')}
                </p>
              </div>

              {/* Secteurs servis */}
              <div className="pt-6">
                <p className="text-sm font-medium text-gray-700 mb-4">
                  {t('newPricing.trust.sectors')}
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                  {(t('newPricing.trust.sectorList', { returnObjects: true }) as string[]).map((sector, index) => (
                    <React.Fragment key={sector}>
                      <span>{sector}</span>
                      {index < (t('newPricing.trust.sectorList', { returnObjects: true }) as string[]).length - 1 && <span>•</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

