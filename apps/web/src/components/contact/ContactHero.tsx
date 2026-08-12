
import React from "react";
import { Mail, Phone } from "lucide-react";

export const ContactHero: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Contactez-nous</h1>
          <p className="text-lg text-gray-600 mb-8">
            Notre équipe est à votre disposition pour répondre à toutes vos questions sur la gestion de votre empreinte carbone.
          </p>
          
          <div className="flex flex-col md:flex-row justify-center gap-6 mb-10">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Mail className="h-5 w-5 text-primary" />
              <a href="mailto:contact@carboscan.io" className="hover:text-primary transition-colors">
                contact@carboscan.io
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Phone className="h-5 w-5 text-primary" />
              <a href="tel:+21698704385" className="hover:text-primary transition-colors">
                +216 98 704 385
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
