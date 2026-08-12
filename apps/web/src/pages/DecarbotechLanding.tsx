
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
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
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <DecarbotechLandingHero />
        <DecarbotechLandingWhySection />
        <DecarbotechLandingActionsSection />
        <DecarbotechLandingPlansSection />
        <DecarbotechLandingSensorsSection />
        <DecarbotechLandingNetZeroSection />
        <DecarbotechLandingTargetSection />
        <DecarbotechLandingIntegrationSection />
        <DecarbotechLandingContactForm />
      </main>

      <NewFooter />
    </div>
  );
};

export default DecarbotechLanding;

