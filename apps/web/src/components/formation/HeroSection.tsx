
import React from "react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5] py-16 md:py-24">
      {/* Abstract Floating Elements - Creates visual interest */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-r from-[#9b87f5]/20 to-[#D6BCFA]/20 blur-2xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-gradient-to-r from-[#FEC6A1]/20 to-[#F97316]/20 blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-gradient-to-r from-[#0EA5E9]/20 to-[#D3E4FD]/20 blur-xl animate-gentle-float"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1 bg-[#9b87f5]/20 text-[#D6BCFA] rounded-full text-sm font-medium mb-5 backdrop-blur-sm">
            Formation Professionnelle Certifiante
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Réduisez vos émissions grâce à notre formation <span className="text-[#9b87f5]">Bilan Carbone®</span>
          </h1>
          
          <p className="text-xl text-gray-200 mb-8">
            La maîtrise de votre empreinte carbone commence par une compréhension claire de vos émissions. Notre formation vous apporte les compétences nécessaires pour initier et piloter efficacement une démarche climat dans votre entreprise.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-8">
              Réserver une session
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              En savoir plus
            </Button>
          </div>
        </div>
      </div>
      
      {/* Carbon emission visualization elements - animated */}
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
        <div className="absolute bottom-0 left-1/4 w-6 h-6 rounded-full bg-[#F97316]/80 animate-evaporate-1"></div>
        <div className="absolute bottom-0 left-1/2 w-6 h-6 rounded-full bg-[#9b87f5]/80 animate-evaporate-2"></div>
        <div className="absolute bottom-0 left-3/4 w-6 h-6 rounded-full bg-[#0EA5E9]/80 animate-evaporate-3"></div>
      </div>
    </section>
  );
};

export default HeroSection;
