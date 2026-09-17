
import React from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const BilanCarboneCTA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartBilan = () => {
    if (user) {
      navigate('/auth'); // Redirect to login/dashboard if user has account
    } else {
      navigate('/contact'); // Redirect to pricing if no account
    }
  };
  return (
    <section id="demarrer" className="py-16 bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Passer à l'action
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Votre impact carbone ne doit plus être un point aveugle.
            <br />
            Commencez dès aujourd'hui avec CarboScan.
          </p>
          
          <div className="inline-block relative">
            <span className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] rounded-md blur-sm transform scale-105 opacity-70"></span>
            <Button 
              size="lg" 
              onClick={handleStartBilan}
              className="relative bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] hover:from-[#8b77e5] hover:to-[#C6ACFA] text-white border-0 px-8 py-6 h-auto text-lg"
            >
              Démarrer mon Bilan Carbone
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BilanCarboneCTA;
