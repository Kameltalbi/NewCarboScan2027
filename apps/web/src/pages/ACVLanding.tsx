
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { ACVLandingHero } from "@/components/acv/ACVLandingHero";
import { ACVLandingWhySection } from "@/components/acv/ACVLandingWhySection";
import { ACVLandingBenefitsSection } from "@/components/acv/ACVLandingBenefitsSection";
import { ACVLandingMethodologySection } from "@/components/acv/ACVLandingMethodologySection";
import { ACVLandingDeliverablesSection } from "@/components/acv/ACVLandingDeliverablesSection";
import { ACVLandingProductsSection } from "@/components/acv/ACVLandingProductsSection";
import { ACVLandingWhyCarboScanSection } from "@/components/acv/ACVLandingWhyCarboScanSection";
import { ACVLandingContactForm } from "@/components/acv/ACVLandingContactForm";

const ACVLanding = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <ACVLandingHero />
        <ACVLandingWhySection />
        <ACVLandingBenefitsSection />
        <ACVLandingMethodologySection />
        <ACVLandingDeliverablesSection />
        <ACVLandingProductsSection />
        <ACVLandingWhyCarboScanSection />
        <ACVLandingContactForm />
      </main>

      <NewFooter />
    </div>
  );
};

export default ACVLanding;

