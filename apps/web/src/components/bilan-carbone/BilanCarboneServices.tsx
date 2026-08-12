import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const BilanCarboneServices = () => {
  const offers = [
    {
      title: "Test gratuit rapide",
      description: "Estimation simple en 3 minutes",
      features: ["Évaluation basique", "Résultat instantané", "Première approche"],
      price: "Gratuit",
      link: "/",
      highlighted: false
    },
    {
      title: "Essentiel",
      description: "PME locales - Scopes 1 & 2",
      features: ["Scopes 1 & 2 uniquement", "Simulation économique €/tCO₂e", "Rapport PDF professionnel", "2 révisions par an"],
      price: "1300 DT/an",
      link: "#demarrer",
      highlighted: false
    },
    {
      title: "Pro (CBAM)",
      description: "PME exportatrices - 3 Scopes complets",
      features: ["Scopes 1, 2 & 3 complets", "Module CBAM", "Expert dédié", "Plan d'action personnalisé"],
      price: "À partir de 2400 DT/an",
      link: "#demarrer",
      highlighted: true
    },
    {
      title: "Expert (Net Zero)",
      description: "Grandes entreprises & groupes",
      features: ["Multi-sites", "Consultant senior dédié", "Formation équipes", "Trajectoire Net Zero 10 ans"],
      price: "Sur devis",
      link: "#demarrer",
      highlighted: false
    }
  ];

  return (
    <section id="nos-offres" className="py-16 md:py-20 bg-[#F1F0FB]">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-[#1A1F2C]">
            Nos offres Bilan Carbone
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offers.map((offer, index) => (
              <Card 
                key={index} 
                className={`border-none shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
                  offer.highlighted ? 'ring-2 ring-[#9b87f5] scale-105' : ''
                }`}
              >
                {offer.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] text-white text-center py-2 text-sm font-medium">
                    Recommandé
                  </div>
                )}
                
                <CardContent className={`p-6 ${offer.highlighted ? 'pt-12' : 'pt-6'}`}>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-[#1A1F2C] mb-2">{offer.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{offer.description}</p>
                    <div className="text-2xl font-bold text-[#9b87f5]">{offer.price}</div>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {offer.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start text-sm">
                        <CheckCircle className="h-4 w-4 text-[#9b87f5] mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <a
                    href={offer.link}
                    className={`w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-300 ${
                      offer.highlighted
                        ? 'bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] text-white hover:from-[#8b77e5] hover:to-[#C6ACFA]'
                        : 'border-2 border-[#9b87f5] text-[#9b87f5] hover:bg-[#9b87f5] hover:text-white'
                    }`}
                  >
                    {offer.title === "Test gratuit rapide" ? "Commencer le test" : "Choisir cette offre"}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Besoin d'aide pour choisir ? Nos experts sont là pour vous accompagner.
            </p>
            <a 
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-[#9b87f5] border-2 border-[#9b87f5] rounded-md hover:bg-[#9b87f5] hover:text-white transition-all duration-300"
            >
              Parler à un expert
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BilanCarboneServices;