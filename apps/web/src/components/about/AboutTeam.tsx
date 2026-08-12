import React from "react";
import { useTranslation } from "react-i18next";

const AboutTeam = () => {
  const { t } = useTranslation();
  const teamMembers = t("team.members", { returnObjects: true }) as any[];
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary-dark mb-8">
            {t("team.title")}
          </h2>
          
          <div className="bg-gradient-to-r from-primary-light/10 to-accent/10 p-8 rounded-lg">
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("team.vision.description")}
            </p>
            
            <div className="mt-6 mb-6">
              <blockquote className="text-xl italic font-semibold text-primary-dark">
                "{t("team.missionQuote")}"
              </blockquote>
            </div>
            
            {/* Team Members Photos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white mb-4">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-primary-dark mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-600 text-center">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutTeam;