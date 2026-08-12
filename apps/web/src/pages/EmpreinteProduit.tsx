
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
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
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <EmpreinteProduitHero />
        <EmpreinteProduitWhySection />
        <EmpreinteProduitBenefitsSection />
        <EmpreinteProduitMethodologySection />
        <EmpreinteProduitDeliverablesSection />
        <EmpreinteProduitProductsSection />
        <EmpreinteProduitWhyCarboScanSection />
        <EmpreinteProduitContactForm />
      </main>

      <NewFooter />
    </div>
  );
};

export default EmpreinteProduit;

