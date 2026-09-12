
import React from "react";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { CollectLandingHero } from "@/components/collect/CollectLandingHero";
import { CollectLandingWhySection } from "@/components/collect/CollectLandingWhySection";
import { CollectLandingBenefitsSection } from "@/components/collect/CollectLandingBenefitsSection";
import { CollectLandingFeaturesSection } from "@/components/collect/CollectLandingFeaturesSection";
import { CollectLandingGainsSection } from "@/components/collect/CollectLandingGainsSection";
import { CollectLandingTargetSection } from "@/components/collect/CollectLandingTargetSection";
import { CollectLandingIntegrationSection } from "@/components/collect/CollectLandingIntegrationSection";
import { CollectLandingContactForm } from "@/components/collect/CollectLandingContactForm";

const CollectLanding = () => {
  return (
    <SolutionLandingShell path="/collect">
        <CollectLandingHero />
        <CollectLandingWhySection />
        <CollectLandingBenefitsSection />
        <CollectLandingFeaturesSection />
        <CollectLandingGainsSection />
        <CollectLandingTargetSection />
        <CollectLandingIntegrationSection />
        <CollectLandingContactForm />
    </SolutionLandingShell>
  );
};

export default CollectLanding;

