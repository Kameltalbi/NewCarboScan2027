import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { useTranslation } from "react-i18next";

const Team = () => {
  const { t } = useTranslation();
  const teamMembers = t("team.members", { returnObjects: true }) as any[];

  // Les images viennent directement du fichier de traduction (member.image)


  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                {t("team.title")}
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                {t("team.subtitle")}
              </p>
              <div className="bg-card/50 backdrop-blur-sm p-8 rounded-lg border">
                <blockquote className="text-xl italic font-semibold text-foreground">
                  "{t("team.missionQuote")}"
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* Team Members */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="space-y-16">
                {teamMembers.map((member, index) => (
                  <div key={index} className={`flex flex-col lg:flex-row items-center gap-8 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                    <div className="lg:w-1/3">
                      <div className="relative flex justify-center">
                        <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg border-4 border-white">
                          <img
                            src={member.image}
                            alt={member.name}
                            className="w-full h-full object-cover object-top"

                            onError={(e) => {
                              console.error('Image failed to load:', member.name, member.image);
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => {}}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3">
                      <div className="bg-card p-8 rounded-xl shadow-lg border">
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          {member.name}
                        </h3>
                        <p className="text-primary font-semibold mb-4">
                          {member.role}
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                          {member.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-8">
                {t("team.vision.title")}
              </h2>
              <div className="bg-card p-8 rounded-xl shadow-lg border">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("team.vision.description")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <NewFooter />
    </div>
  );
};

export default Team;