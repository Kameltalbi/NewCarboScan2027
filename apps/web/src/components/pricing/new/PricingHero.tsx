import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const PricingHero: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative bg-gradient-to-br from-[#009879] via-[#007a63] to-[#005a47] text-white py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Texte */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {t('newPricing.hero.title')}
            </h1>
            <p className="text-xl text-green-100 leading-relaxed">
              {t('newPricing.hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => {
                  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white text-[#009879] hover:bg-green-50 font-semibold px-8 py-6 text-lg"
              >
                {t('newPricing.hero.ctaPrimary')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  document.getElementById('offers-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
              >
                {t('newPricing.hero.ctaSecondary')}
              </Button>
            </div>
          </div>

          {/* Visuel */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="flex items-center justify-center mb-6">
                <TrendingDown className="h-16 w-16 text-green-200" />
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '75%' }}></div>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
              <p className="text-center text-green-100 mt-6 text-sm">
                {t('newPricing.hero.visualText')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

