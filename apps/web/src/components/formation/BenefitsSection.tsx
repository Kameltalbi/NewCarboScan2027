
import React from "react";
import { GraduationCap, Award, Lightbulb } from "lucide-react";

const BenefitsSection = () => {
  return (
    <section className="py-16 bg-[#F1F0FB]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1F2C] mb-4">
            Ce que vous <span className="text-[#9b87f5]">obtenez</span>
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] mx-auto"></div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-3">
              <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 bg-[#F2FCE2] rounded-full flex items-center justify-center">
                    <GraduationCap className="text-[#4CAF50] w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#1A1F2C] text-center mb-3">Une compétence stratégique</h3>
                <p className="text-gray-600 text-center">Valorisable immédiatement dans votre parcours professionnel.</p>
              </div>
              
              <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 bg-[#FEF7CD] rounded-full flex items-center justify-center">
                    <Award className="text-[#F97316] w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#1A1F2C] text-center mb-3">Un certificat</h3>
                <p className="text-gray-600 text-center">Attestation officielle de participation à la formation.</p>
              </div>
              
              <div className="p-8">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 bg-[#E5DEFF] rounded-full flex items-center justify-center">
                    <Lightbulb className="text-[#9b87f5] w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#1A1F2C] text-center mb-3">Un guide pratique</h3>
                <p className="text-gray-600 text-center">Bonnes pratiques et outils opérationnels pour agir efficacement.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
