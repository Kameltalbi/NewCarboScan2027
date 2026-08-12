
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const BilanCarboneMethodology = () => {
  const methodologies = [
    {
      title: "Méthodes reconnues",
      description: "Bilan Carbone® ADEME et GHG Protocol",
      icon: "🔍",
    },
    {
      title: "Facteurs d'émissions officiels",
      description: "Issus de la Base Carbone®",
      icon: "📊",
    },
    {
      title: "Outil automatisé",
      description: "Pour un calcul rapide, fiable et conforme",
      icon: "⚙️",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-[#1A1F2C]">
            Notre méthodologie
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {methodologies.map((item, index) => (
              <Card 
                key={index} 
                className="text-center border-none shadow-md hover:shadow-lg transition-shadow"
              >
                <CardContent className="pt-8 pb-6 px-4">
                  <span className="text-4xl mb-4 inline-block">{item.icon}</span>
                  <h3 className="text-xl font-semibold mb-3 text-[#1A1F2C]">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 italic">
              "La conformité aux standards internationaux garantit des résultats exploitables 
              et comparables d'une année sur l'autre."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BilanCarboneMethodology;
