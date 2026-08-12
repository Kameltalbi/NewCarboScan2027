
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
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
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <CollectLandingHero />
        <CollectLandingWhySection />
        <CollectLandingBenefitsSection />
        <CollectLandingFeaturesSection />
        <CollectLandingGainsSection />
        <CollectLandingTargetSection />
        <CollectLandingIntegrationSection />
        <CollectLandingContactForm />
      </main>

      <NewFooter />
    </div>
  );
};

export default CollectLanding;

