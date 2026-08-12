import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const ACVMethodology = () => {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-[#1A1F2C]">
            Notre méthodologie ACV
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-[#1EAEDB] to-[#33C3F0] mx-auto mb-12"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-gray-100 hover:shadow-lg transition-shadow duration-300 bg-gradient-to-b from-white to-[#F2FCE2]/30">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#D3E4FD] rounded-full flex items-center justify-center mb-4">
                  <span className="text-[#1EAEDB] font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-[#1A1F2C]">
                  Définition des objectifs
                </h3>
                <p className="text-gray-600">
                  Analyse des besoins et définition du périmètre d'étude selon les normes ISO 14040/14044
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 hover:shadow-lg transition-shadow duration-300 bg-gradient-to-b from-white to-[#FEF7CD]/30">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#FEF7CD] rounded-full flex items-center justify-center mb-4">
                  <span className="text-[#F97316] font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-[#1A1F2C]">
                  Inventaire des données
                </h3>
                <p className="text-gray-600">
                  Collecte et quantification de tous les flux entrants et sortants du système étudié
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 hover:shadow-lg transition-shadow duration-300 bg-gradient-to-b from-white to-[#D3E4FD]/30">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#D3E4FD] rounded-full flex items-center justify-center mb-4">
                  <span className="text-[#1EAEDB] font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-[#1A1F2C]">
                  Évaluation des impacts
                </h3>
                <p className="text-gray-600">
                  Analyse quantitative des impacts environnementaux et recommandations d'amélioration
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ACVMethodology;