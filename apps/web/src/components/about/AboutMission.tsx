import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

const AboutMission = () => {
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <Globe className="h-10 w-10 text-[#1EAEDB] mr-4" />
            <h2 className="text-3xl font-bold text-[#1A1F2C]">Notre Mission</h2>
          </div>
          
          <Card className="border-none shadow-lg overflow-hidden">
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                Chez CarboScan, nous accompagnons les entreprises dans leur transition vers un avenir plus durable. Notre mission est de démocratiser l'accès aux outils de mesure et de pilotage de l'empreinte carbone.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                Nous croyons que chaque organisation, quelle que soit sa taille, peut contribuer significativement à la lutte contre le changement climatique. Notre plateforme combine expertise technique et simplicité d'usage pour rendre cette transformation accessible à tous.
              </p>
            </CardContent>
          </Card>

          <div className="mt-16">
            <h2 className="text-3xl font-bold text-[#1A1F2C] mb-8 text-center">Ce que nous faisons</h2>
            <p className="text-lg text-gray-700 mb-8 text-center">
              Notre plateforme offre une solution complète pour mesurer, analyser et réduire votre empreinte carbone.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F2FCE2] p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-[#1EAEDB] h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    🔍
                  </div>
                  <h3 className="font-semibold text-xl">Mesurer</h3>
                </div>
                <p className="text-gray-700">
                  Calculez précisément votre bilan carbone grâce à nos outils certifiés et nos méthodologies éprouvées.
                </p>
              </div>
              
              <div className="bg-[#F2FCE2] p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-[#1EAEDB] h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    📊
                  </div>
                  <h3 className="font-semibold text-xl">Analyser</h3>
                </div>
                <p className="text-gray-700">
                  Identifiez vos principaux postes d'émissions et les leviers d'action prioritaires pour votre secteur.
                </p>
              </div>
              
              <div className="bg-[#F2FCE2] p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-[#1EAEDB] h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    🎯
                  </div>
                  <h3 className="font-semibold text-xl">Agir</h3>
                </div>
                <p className="text-gray-700">
                  Développez et pilotez votre stratégie de décarbonation avec des plans d'action personnalisés.
                </p>
              </div>
              
              <div className="bg-[#F2FCE2] p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-[#1EAEDB] h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    🧾
                  </div>
                  <h3 className="font-semibold text-xl">Se Conformer</h3>
                </div>
                <p className="text-gray-700">
                  Respectez les obligations réglementaires (CSRD, MACF) avec nos rapports certifiés.
                </p>
              </div>
            </div>
            
            <p className="text-lg text-gray-700 mt-8 text-center">
              Notre approche hybride combine l'efficacité des outils digitaux et l'expertise humaine de nos consultants spécialisés.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutMission;