
import React from "react";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { EmpreinteProduitHero } from "@/components/empreinte-produit/EmpreinteProduitHero";
import { EmpreinteProduitWhySection } from "@/components/empreinte-produit/EmpreinteProduitWhySection";
import { EmpreinteProduitBenefitsSection } from "@/components/empreinte-produit/EmpreinteProduitBenefitsSection";
import { EmpreinteProduitMethodologySection } from "@/components/empreinte-produit/EmpreinteProduitMethodologySection";
import { EmpreinteProduitDeliverablesSection } from "@/components/empreinte-produit/EmpreinteProduitDeliverablesSection";
import { EmpreinteProduitProductsSection } from "@/components/empreinte-produit/EmpreinteProduitProductsSection";
import { EmpreinteProduitWhyCarboScanSection } from "@/components/empreinte-produit/EmpreinteProduitWhyCarboScanSection";
import { EmpreinteProduitContactForm } from "@/components/empreinte-produit/EmpreinteProduitContactForm";

const EmpreinteProduit = () => {
  return (
    <SolutionLandingShell path="/empreinte-produit">
        <EmpreinteProduitHero />
        <EmpreinteProduitWhySection />
        <EmpreinteProduitBenefitsSection />
        <EmpreinteProduitMethodologySection />
        <EmpreinteProduitDeliverablesSection />
        <EmpreinteProduitProductsSection />
        <EmpreinteProduitWhyCarboScanSection />
        <EmpreinteProduitContactForm />
    </SolutionLandingShell>
  );
};

export default EmpreinteProduit;

