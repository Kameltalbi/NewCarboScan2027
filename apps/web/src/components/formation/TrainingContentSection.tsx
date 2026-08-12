
import React from "react";
import { CalendarDays } from "lucide-react";

const TrainingContentSection = () => {
  return (
    <section className="py-16 bg-[#F1F0FB]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#1A1F2C]">
          Contenu de la formation <span className="text-[#9b87f5]">(1,5 jour)</span>
        </h2>
        
        {/* Day 1 */}
        <div className="relative mb-20">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#9b87f5] to-[#D6BCFA] hidden md:block"></div>
          
          <div className="md:ml-12 relative">
            <div className="absolute -left-16 top-0 w-8 h-8 rounded-full bg-[#9b87f5] flex items-center justify-center text-white font-bold hidden md:flex">1</div>
            <div className="bg-white rounded-lg shadow-xl p-8 border-l-4 border-[#9b87f5]">
              <h3 className="text-2xl font-bold text-[#1A1F2C] mb-4 flex items-center">
                <CalendarDays className="mr-2 text-[#9b87f5]" />
                Jour 1 – Comprendre & Calculer
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#F1F0FB] p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Les enjeux climatiques</h4>
                  <p className="text-gray-700">Les enjeux climatiques et le rôle des entreprises dans la transition écologique.</p>
                </div>
                
                <div className="bg-[#F1F0FB] p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Les méthodologies</h4>
                  <p className="text-gray-700">GHG Protocol & Bilan Carbone® ADEME : comprendre les standards internationaux.</p>
                </div>
                
                <div className="bg-[#F1F0FB] p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Identifier les scopes</h4>
                  <p className="text-gray-700">Apprendre à différencier et à catégoriser les émissions scopes 1, 2 et 3.</p>
                </div>
                
                <div className="bg-[#F1F0FB] p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Collecte de données</h4>
                  <p className="text-gray-700">Comment collecter et structurer les données pour un bilan précis et exploitable.</p>
                </div>
                
                <div className="col-span-2 bg-[#F1F0FB] p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Utiliser un outil de calcul</h4>
                  <p className="text-gray-700">Cas pratique guidé : prise en main d'un outil professionnel pour calculer votre empreinte carbone.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Day 1.5 */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#D946EF] to-[#FFDEE2] hidden md:block"></div>
          
          <div className="md:ml-12 relative">
            <div className="absolute -left-16 top-0 w-8 h-8 rounded-full bg-[#D946EF] flex items-center justify-center text-white font-bold hidden md:flex">2</div>
            <div className="bg-white rounded-lg shadow-xl p-8 border-l-4 border-[#D946EF]">
              <h3 className="text-2xl font-bold text-[#1A1F2C] mb-4 flex items-center">
                <CalendarDays className="mr-2 text-[#D946EF]" />
                Demi-journée – Réduire & Agir
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#FDE1D3]/50 p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Interprétation des résultats</h4>
                  <p className="text-gray-700">Comment analyser votre bilan carbone et identifier les priorités d'action.</p>
                </div>
                
                <div className="bg-[#FDE1D3]/50 p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Définir des actions prioritaires</h4>
                  <p className="text-gray-700">Sélectionner les leviers à fort impact pour une stratégie efficace.</p>
                </div>
                
                <div className="bg-[#FDE1D3]/50 p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Construire un plan de réduction</h4>
                  <p className="text-gray-700">Élaborer une feuille de route alignée avec les enjeux de votre secteur.</p>
                </div>
                
                <div className="bg-[#FDE1D3]/50 p-6 rounded-lg">
                  <h4 className="font-medium text-lg text-[#1A1F2C] mb-3">Introduction aux stratégies avancées</h4>
                  <p className="text-gray-700">Comprendre Net Zero, SBTi et MACF pour préparer l'avenir.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrainingContentSection;
