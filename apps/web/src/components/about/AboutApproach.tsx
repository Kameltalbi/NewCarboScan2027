import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const AboutApproach = () => {
  
  const approaches = [
    'Expertise technique approfondie en méthodologies carbone',
    'Accompagnement personnalisé selon votre secteur d\'activité',
    'Outils digitaux innovants pour simplifier vos démarches',
    'Formation de vos équipes aux enjeux climatiques'
  ];

  const commitments = [
    'Transparence totale sur nos méthodologies et calculs',
    'Confidentialité absolue de vos données d\'entreprise',
    'Support réactif et expertise disponible',
    'Mise à jour continue selon les évolutions réglementaires'
  ];

  return (
    <section className="py-16 bg-[#F5F7F9]">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1A1F2C] mb-12 text-center">
            Notre Approche
          </h2>
          
          <Card className="border-none shadow-lg mb-12">
            <CardContent className="p-8">
              <ul className="space-y-4">
                {approaches.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-[#1EAEDB] mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <h2 className="text-3xl font-bold text-[#1A1F2C] mb-12 text-center">
            Nos Engagements
          </h2>
          
          <Card className="border-none shadow-lg">
            <CardContent className="p-8">
              <ul className="space-y-4">
                {commitments.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-[#1EAEDB] mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AboutApproach;