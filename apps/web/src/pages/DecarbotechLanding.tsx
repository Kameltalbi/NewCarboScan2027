
import React from "react";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { DecarbotechLandingHero } from "@/components/decarbotech/DecarbotechLandingHero";
import { DecarbotechLandingWhySection } from "@/components/decarbotech/DecarbotechLandingWhySection";
import { DecarbotechLandingActionsSection } from "@/components/decarbotech/DecarbotechLandingActionsSection";
import { DecarbotechLandingPlansSection } from "@/components/decarbotech/DecarbotechLandingPlansSection";
import { DecarbotechLandingSensorsSection } from "@/components/decarbotech/DecarbotechLandingSensorsSection";
import { DecarbotechLandingNetZeroSection } from "@/components/decarbotech/DecarbotechLandingNetZeroSection";
import { DecarbotechLandingTargetSection } from "@/components/decarbotech/DecarbotechLandingTargetSection";
import { DecarbotechLandingIntegrationSection } from "@/components/decarbotech/DecarbotechLandingIntegrationSection";
import { DecarbotechLandingContactForm } from "@/components/decarbotech/DecarbotechLandingContactForm";

const DecarbotechLanding = () => {
  return (
    <SolutionLandingShell path="/decarbotech">
        <DecarbotechLandingHero />
        <DecarbotechLandingWhySection />
        <DecarbotechLandingActionsSection />
        <DecarbotechLandingPlansSection />
        <DecarbotechLandingSensorsSection />
        <DecarbotechLandingNetZeroSection />
        <DecarbotechLandingTargetSection />
        <DecarbotechLandingIntegrationSection />
        <DecarbotechLandingContactForm />
    </SolutionLandingShell>
  );
};

export default DecarbotechLanding;

