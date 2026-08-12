
import React from "react";
import { Button } from "@/components/ui/button";
import { Globe, CloudRain } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";


export const HeroSection: React.FC = () => {
  const isMobile = useIsMobile();
  
  
  return (
    <section className="py-8 md:py-16 bg-[#f9f9f9]">
      <div className="container mx-auto grid md:grid-cols-2 gap-8 items-center px-4 md:px-0">
        <div className="space-y-4 md:space-y-6 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Calculez, comprenez, réduisez — Votre Bilan Carbone en toute simplicité
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Simplicité d'utilisation et accompagnement expert pour votre transition écologique
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <Button 
              onClick={() => document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-primary hover:bg-green-600 text-white px-4 sm:px-6 py-2 w-full sm:w-auto"
            >
              Essayer gratuitement
            </Button>
            <Link to="/contact">
              <Button variant="outline" className="border-primary text-primary hover:bg-green-50 w-full sm:w-auto">
                Demander une démo
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-center items-center relative mt-8 md:mt-0">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="relative">
                <CloudRain 
                  size={isMobile ? 20 : 24} 
                  className={`text-gray-400/70 animate-evaporate-${i+1}`}
                  strokeWidth={1}
                />
              </div>
            ))}
          </div>
          <div className="relative">
            <Globe 
              size={isMobile ? 200 : 280} 
              className="text-primary animate-gentle-float" 
              strokeWidth={1}
            />
            {/* CO₂e labels that will traverse the globe and disappear */}
            <span className="absolute top-1/2 left-0 transform -translate-y-1/2 text-xs md:text-sm font-medium text-gray-400/70 animate-traverse-1">
              CO₂e
            </span>
            <span className="absolute top-1/3 left-1/4 transform -translate-y-1/2 text-xs md:text-sm font-medium text-gray-400/70 animate-traverse-2">
              CO₂e
            </span>
            <span className="absolute bottom-1/4 right-1/4 transform -translate-y-1/2 text-xs md:text-sm font-medium text-gray-400/70 animate-traverse-3">
              CO₂e
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
