
import React from "react";
import { GraduationCap, Award, ChartBar } from "lucide-react";

const TargetAudienceSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-[#1A1F2C] to-[#403E43]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            <span className="text-[#9b87f5]">Pour qui</span> est cette formation ?
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] mx-auto"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#1A1F2C]/60 backdrop-blur-sm p-8 rounded-lg border border-[#9b87f5]/20 hover:border-[#9b87f5]/80 transition-all group">
            <div className="w-16 h-16 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-all">
              <GraduationCap className="text-white w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-3">Dirigeants et responsables RSE</h3>
            <p className="text-gray-300 text-center">Prenez des décisions éclairées et définissez une stratégie climat efficace.</p>
          </div>
          
          <div className="bg-[#1A1F2C]/60 backdrop-blur-sm p-8 rounded-lg border border-[#9b87f5]/20 hover:border-[#9b87f5]/80 transition-all group">
            <div className="w-16 h-16 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-all">
              <Award className="text-white w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-3">Consultants et experts</h3>
            <p className="text-gray-300 text-center">Enrichissez votre offre de services et accompagnez efficacement vos clients.</p>
          </div>
          
          <div className="bg-[#1A1F2C]/60 backdrop-blur-sm p-8 rounded-lg border border-[#9b87f5]/20 hover:border-[#9b87f5]/80 transition-all group">
            <div className="w-16 h-16 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-all">
              <ChartBar className="text-white w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-3">Responsables fonctionnels</h3>
            <p className="text-gray-300 text-center">QHSE, Achats ou Développement durable : intégrez le climat dans vos processus.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TargetAudienceSection;
