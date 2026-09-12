
import React from "react";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { BilanCarboneLandingHero } from "@/components/bilan-carbone/BilanCarboneLandingHero";
import { BilanCarboneWhySection } from "@/components/bilan-carbone/BilanCarboneWhySection";
import { BilanCarboneBenefitsSection } from "@/components/bilan-carbone/BilanCarboneBenefitsSection";
import { BilanCarboneMethodologySection } from "@/components/bilan-carbone/BilanCarboneMethodologySection";
import { BilanCarboneResultsSection } from "@/components/bilan-carbone/BilanCarboneResultsSection";
import { BilanCarboneIndustriesSection } from "@/components/bilan-carbone/BilanCarboneIndustriesSection";
import { BilanCarboneContactForm } from "@/components/bilan-carbone/BilanCarboneContactForm";

const BilanCarbone = () => {
  return (
    <SolutionLandingShell path="/bilan-carbone">
        <BilanCarboneLandingHero />
        <BilanCarboneWhySection />
        <BilanCarboneBenefitsSection />
        <BilanCarboneMethodologySection />
        <BilanCarboneResultsSection />
        <BilanCarboneIndustriesSection />
        <BilanCarboneContactForm />
    </SolutionLandingShell>
  );
};

export default BilanCarbone;
