import React from "react";
import { Button } from "@/components/ui/button";

const CallToActionSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prêt à maîtriser le Bilan Carbone® ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Rejoignez notre prochaine session de formation et devenez expert en calcul carbone
          </p>
          
          <Button 
            size="lg" 
            className="bg-white text-[#1A1F2C] hover:bg-white/90 hover:text-[#6E59A5] px-8 text-lg rounded-[4px] shadow-md"
          >
            S'inscrire maintenant
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;