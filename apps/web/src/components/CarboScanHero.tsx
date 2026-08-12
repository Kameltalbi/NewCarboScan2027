import React from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Shield, Globe, CloudRain } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CarboScanHero: React.FC = () => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <section className="relative py-16 sm:py-20 md:py-32 bg-gradient-to-br from-blue-primary via-blue-primary/90 to-blue-primary/80 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-green-accent/10 blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-green-accent/20 blur-2xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="text-white">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <div className="text-white">{t("hero.title")}</div>
              <div className="text-green-accent">{t("hero.subtitle")}</div>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-8 sm:mb-10">
              {t("hero.description")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="bg-green-accent hover:bg-green-accent/90 text-white px-8 py-4 text-lg font-medium w-full"
                >
                  {t("hero.registerButton")}
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-blue-primary px-8 py-4 text-lg w-full"
              >
                {t("navigation.cta.tryFree")}
              </Button>
            </div>
            
          </div>

          {/* Globe animation section */}
          <div className="flex justify-center items-center relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="relative">
                  <CloudRain 
                    size={isMobile ? 20 : 24} 
                    className={`text-white/50 animate-evaporate-${i+1}`}
                    strokeWidth={1}
                  />
                </div>
              ))}
            </div>
            <div className="relative">
              <Globe 
                size={isMobile ? 240 : 320} 
                className="text-green-accent animate-gentle-float" 
                strokeWidth={1}
              />
              {/* CO₂e labels that will traverse the globe and disappear */}
              <span className="absolute top-1/2 left-0 transform -translate-y-1/2 text-xs md:text-sm font-medium text-white/50 animate-traverse-1">
                CO₂e
              </span>
              <span className="absolute top-1/3 left-1/4 transform -translate-y-1/2 text-xs md:text-sm font-medium text-white/50 animate-traverse-2">
                CO₂e
              </span>
              <span className="absolute bottom-1/4 right-1/4 transform -translate-y-1/2 text-xs md:text-sm font-medium text-white/50 animate-traverse-3">
                CO₂e
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};