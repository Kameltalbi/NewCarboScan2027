
import React from "react";

const BilanCarboneHero = () => {
  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5] overflow-hidden">
      {/* Abstract Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-r from-[#9b87f5]/20 to-[#D6BCFA]/20 blur-2xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-gradient-to-r from-[#D6BCFA]/20 to-[#9b87f5]/20 blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Mesurez et réduisez l'empreinte carbone de votre entreprise
          </h1>
          
          <p className="text-xl text-gray-200 mb-10">
            Le Bilan Carbone® est l'outil de référence pour mesurer vos émissions de gaz à effet de serre (GES). 
            Il constitue la première étape indispensable pour comprendre votre impact, prioriser vos actions 
            et engager votre transition vers une activité bas carbone.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="inline-block relative">
              <span className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] rounded-md blur-sm transform scale-105 opacity-70"></span>
              <a 
                href="#nos-offres" 
                className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] rounded-[4px] hover:from-[#8b77e5] hover:to-[#C6ACFA] transition-all duration-300 shadow-lg"
              >
                Voir nos offres
              </a>
            </div>
            
            <a 
              href="/" 
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white border-2 border-white/30 rounded-[4px] hover:bg-white/10 transition-all duration-300"
            >
              Test gratuit rapide
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BilanCarboneHero;
