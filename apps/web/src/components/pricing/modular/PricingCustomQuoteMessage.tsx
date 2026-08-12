import React from 'react';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PricingCustomQuoteMessage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-white">
      <div className="w-full px-4 md:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#F5F7F9] to-white p-8 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#009879]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-6 w-6 text-[#009879]" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#009879] mb-4">
                {t('pricing.modular.customQuote.title')}
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                {t('pricing.modular.customQuote.message')}
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#009879] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600">
                    {t('pricing.modular.customQuote.benefit1')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#009879] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600">
                    {t('pricing.modular.customQuote.benefit2')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#009879] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600">
                    {t('pricing.modular.customQuote.benefit3')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

