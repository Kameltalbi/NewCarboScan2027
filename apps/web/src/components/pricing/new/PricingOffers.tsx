import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface Offer {
  id: string;
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  target: string;
  features: string[];
  cta: string;
  ctaAction: () => void;
  popular?: boolean;
  highlight?: string;
}

export const PricingOffers: React.FC = () => {
  const { t } = useTranslation();
  
  const scrollToContact = () => {
    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSimulator = () => {
    document.getElementById('simulator-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const offers: Offer[] = [
    {
      id: 'decouverte',
      name: t('newPricing.offers.decouverte.name'),
      price: t('newPricing.offers.decouverte.price'),
      priceNote: t('newPricing.offers.decouverte.priceNote'),
      description: t('newPricing.offers.decouverte.description'),
      target: t('newPricing.offers.decouverte.target'),
      features: (t('newPricing.offers.decouverte.features', { returnObjects: true }) as string[]),
      cta: t('newPricing.offers.decouverte.cta'),
      ctaAction: scrollToSimulator,
    },
    {
      id: 'engagement',
      name: t('newPricing.offers.engagement.name'),
      price: t('newPricing.offers.engagement.price'),
      description: t('newPricing.offers.engagement.description'),
      target: t('newPricing.offers.engagement.target'),
      features: (t('newPricing.offers.engagement.features', { returnObjects: true }) as string[]),
      cta: t('newPricing.offers.engagement.cta'),
      ctaAction: scrollToContact,
      popular: true,
    },
    {
      id: 'partenaire',
      name: t('newPricing.offers.partenaire.name'),
      price: t('newPricing.offers.partenaire.price'),
      description: t('newPricing.offers.partenaire.description'),
      target: t('newPricing.offers.partenaire.target'),
      features: (t('newPricing.offers.partenaire.features', { returnObjects: true }) as string[]),
      cta: t('newPricing.offers.partenaire.cta'),
      ctaAction: scrollToContact,
    },
  ];

  return (
    <section id="offers-section" className="py-16 bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('newPricing.offers.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('newPricing.offers.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {offers.map((offer, index) => (
            <Card
              key={offer.id}
              className={`relative flex flex-col ${
                offer.popular
                  ? 'border-2 border-[#009879] shadow-xl scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {offer.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-[#009879] text-white px-4 py-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('newPricing.offers.engagement.popular')}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {offer.name}
                </CardTitle>
                <p className="text-sm text-gray-500 mb-4">{offer.description}</p>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-[#009879]">{offer.price}</div>
                  {offer.priceNote && (
                    <p className="text-sm text-gray-600 font-medium">{offer.priceNote}</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-4">{offer.target}</p>
                  <ul className="space-y-3">
                    {offer.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-[#009879] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-6">
                  <Button
                    onClick={offer.ctaAction}
                    className={`w-full ${
                      offer.popular
                        ? 'bg-[#009879] hover:bg-[#007a63] text-white'
                        : 'bg-[#0A5275] hover:bg-[#084a68] text-white'
                    }`}
                    size="lg"
                  >
                    {offer.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

