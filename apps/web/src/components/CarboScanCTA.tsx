import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CarboScanCTA: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="py-16 md:py-24 bg-gradient-to-r from-blue-primary to-blue-primary/90">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            {t("cta.subtitle")}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-green-accent hover:bg-green-accent/90 text-white px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium w-full sm:w-auto"
            >
              <MessageCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="truncate">{t("cta.contactButton")}</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-blue-primary px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
            >
              <span className="truncate">{t("cta.calculatorButton")}</span>
              <ArrowRight className="w-5 h-5 ml-2 flex-shrink-0" />
            </Button>
          </div>
          

        </div>
      </div>
    </section>
  );
};