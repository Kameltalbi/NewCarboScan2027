
import React from "react";
import { HomeHeader } from "@/components/HomeHeader";
import { NewHeroSection } from "@/components/NewHeroSection";
import { SuiteModulesSection } from "@/components/homepage/SuiteModulesSection";
import { CarboScanWattBimToggleSection } from "@/components/homepage/CarboScanWattBimToggleSection";
import { WhyCarboScanSection } from "@/components/homepage/WhyCarboScanSection";
import { LocalSupportSection } from "@/components/homepage/LocalSupportSection";
import { NewReferencesSection } from "@/components/NewReferencesSection";
import { GuideDownloadSection } from "@/components/homepage/GuideDownloadSection";
import { ModernCTA } from "@/components/ModernCTA";
import { NewFooter } from "@/components/NewFooter";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <HomeHeader />

      <main id="main-content" className="flex-1">
        <NewHeroSection />
        <LocalSupportSection />
        <NewReferencesSection />
        <SuiteModulesSection />
        <CarboScanWattBimToggleSection />
        <WhyCarboScanSection />
        <GuideDownloadSection />
        <ModernCTA />
      </main>

      <NewFooter />
    </div>
  );
};

export default Index;
