
import React from "react";
import { Card } from "@/components/ui/card";
import { Target, FileText, TrendingUp, Shield } from "lucide-react";

const BilanCarboneBenefits = () => {
  const benefits = [
    {
      icon: <Target className="h-8 w-8 text-[#9b87f5]" />,
      title: "Identifier vos postes d'émissions",
      description: "Scopes 1, 2 et 3 conformes aux standards internationaux",
    },
    {
      icon: <FileText className="h-8 w-8 text-[#9b87f5]" />,
      title: "Répondre aux obligations réglementaires",
      description: "CSRD, SBTi, MACF et autres exigences",
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-[#9b87f5]" />,
      title: "Initier une trajectoire de réduction",
      description: "Alignée avec les Accords de Paris",
    },
    {
      icon: <Shield className="h-8 w-8 text-[#9b87f5]" />,
      title: "Accroître votre résilience",
      description: "Face aux enjeux climatiques actuels et futurs",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-[#1A1F2C]">
          Pourquoi réaliser un Bilan Carbone ?
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] mx-auto mb-12"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-6 border-none shadow-lg hover:shadow-xl transition-shadow bg-white">
              <div className="w-16 h-16 rounded-full bg-[#F1F0FB] flex items-center justify-center mb-4 mx-auto">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-semibold text-[#1A1F2C] text-center mb-3">
                {benefit.title}
              </h3>
              <p className="text-gray-600 text-center">
                {benefit.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BilanCarboneBenefits;
