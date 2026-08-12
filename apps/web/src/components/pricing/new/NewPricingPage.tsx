import React from 'react';
import { PricingHero } from './PricingHero';
import { PricingPhilosophy } from './PricingPhilosophy';
import { PricingOffers } from './PricingOffers';
import { PricingSimulator } from './PricingSimulator';
import { PricingIncluded } from './PricingIncluded';
import { PricingFAQ } from './PricingFAQ';
import { PricingContact } from './PricingContact';
import { PricingTrust } from './PricingTrust';

export const NewPricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <PricingHero />
      <PricingPhilosophy />
      <PricingOffers />
      <PricingSimulator />
      <PricingIncluded />
      <PricingFAQ />
      <PricingContact />
      <PricingTrust />
    </div>
  );
};

