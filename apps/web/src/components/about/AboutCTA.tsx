
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AboutCTA = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-[#1A1F2C] to-[#1EAEDB]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prêt à commencer votre transition carbone ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Contactez-nous dès aujourd'hui pour découvrir comment CarboScan peut transformer votre approche environnementale.
          </p>
          
          <Link to="/contact">
            <Button size="lg" className="bg-white text-[#1A1F2C] hover:bg-white/90 hover:text-[#1EAEDB] px-8 text-lg">
              Nous contacter
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AboutCTA;
