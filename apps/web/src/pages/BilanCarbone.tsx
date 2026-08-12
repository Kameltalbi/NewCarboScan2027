
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { BilanCarboneLandingHero } from "@/components/bilan-carbone/BilanCarboneLandingHero";
import { BilanCarboneWhySection } from "@/components/bilan-carbone/BilanCarboneWhySection";
import { BilanCarboneBenefitsSection } from "@/components/bilan-carbone/BilanCarboneBenefitsSection";
import { BilanCarboneMethodologySection } from "@/components/bilan-carbone/BilanCarboneMethodologySection";
import { BilanCarboneResultsSection } from "@/components/bilan-carbone/BilanCarboneResultsSection";
import { BilanCarboneIndustriesSection } from "@/components/bilan-carbone/BilanCarboneIndustriesSection";
import { BilanCarboneContactForm } from "@/components/bilan-carbone/BilanCarboneContactForm";

const BilanCarbone = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <BilanCarboneLandingHero />
        <BilanCarboneWhySection />
        <BilanCarboneBenefitsSection />
        <BilanCarboneMethodologySection />
        <BilanCarboneResultsSection />
        <BilanCarboneIndustriesSection />
        <BilanCarboneContactForm />
      </main>

      <NewFooter />
    </div>
  );
};

export default BilanCarbone;
