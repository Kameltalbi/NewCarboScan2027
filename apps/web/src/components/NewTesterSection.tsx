import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Shield, Zap, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const NewTesterSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const startTest = () => {
    navigate('/calculateur-carbone');
  };

  return (
    <section id="tester" className="py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-16">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-5">
              {t("newHomepage.tester.title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t("newHomepage.tester.subtitle")}
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-primary/10">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("newHomepage.tester.features.free")}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-primary/10">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("newHomepage.tester.features.time")}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-primary/10">
                <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("newHomepage.tester.features.secure")}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-primary/10">
                <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("newHomepage.tester.features.instant")}</span>
              </div>
            </div>
          </div>

          {/* Right Visual - Scopes Image */}
          <div className="relative">
            <div className="bg-white rounded-[var(--radius)] shadow-strong p-8 relative overflow-hidden h-full flex flex-col justify-center">
              {/* Image Title */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("newHomepage.tester.chartTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("newHomepage.tester.chartSubtitle")}
                </p>
              </div>

              {/* Scopes Image */}
              <div className="flex justify-center items-center">
                <img 
                  src="/lovable-uploads/scopes.png" 
                  alt="Répartition des scopes d'émissions carbone"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:opacity-90 text-white px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto max-w-xs sm:max-w-none"
            onClick={startTest}
          >
            <span className="truncate">{t("newHomepage.tester.cta.button")}</span>
            <Rocket className="w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 flex-shrink-0" />
          </Button>
          <p className="mt-4 text-muted-foreground text-sm">
            {t("newHomepage.tester.cta.note")}
          </p>
        </div>
      </div>
    </section>
  );
};