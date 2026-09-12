
import React from "react";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
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
    <SolutionLandingShell path="/acv-landing">
        <ACVLandingHero />
        <ACVLandingWhySection />
        <ACVLandingBenefitsSection />
        <ACVLandingMethodologySection />
        <ACVLandingDeliverablesSection />
        <ACVLandingProductsSection />
        <ACVLandingWhyCarboScanSection />
        <ACVLandingContactForm />
    </SolutionLandingShell>
  );
};

export default ACVLanding;

