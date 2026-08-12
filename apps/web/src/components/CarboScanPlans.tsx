import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Users, Building2, Headphones, FileText, Target, Zap } from "lucide-react";

const plans = [
  {
    name: "CarboStart",
    target: "PME & ETI",
    price: "2 500 TND",
    period: "/an",
    description: "Pour PME & ETI - Démarrez votre démarche climat avec sérénité",
    features: [
      { icon: FileText, text: "Bilan Carbone complet — Scopes 1 & 2" },
      { icon: Users, text: "Jusqu'à 3 utilisateurs — Collaboration entre services" },
      { icon: Headphones, text: "Support prioritaire — Assistance par email & chat avec délais réduits" },
      { icon: FileText, text: "Exports PDF & Excel — Résultats détaillés par poste et par année" },
      { icon: Target, text: "3 révisions par an — Début, milieu et fin d'année" },
      { icon: Target, text: "Plan d'action personnalisé — Suggestions standardisées par poste d'émission" }
    ],
    limitations: [
      "Scope 3 non inclus",
      "Trajectoire Net Zero non incluse",
      "Pas de hotline dédiée ni de rendez-vous expert",
      "Pas de reporting consolidé multi-sites"
    ],
    cta: "Demander un accès",
    highlighted: false
  },
  {
    name: "CarboPlus",
    target: "Entreprises moyennes & ETI",
    price: "4 500 TND",
    period: "/an",
    description: "Solution complète avec Scope 3 - Bilan carbone exhaustif pour entreprises ambitieuses",
    features: [
      { icon: FileText, text: "Bilan Carbone complet — Scopes 1, 2 & 3" },
      { icon: Users, text: "Jusqu'à 10 utilisateurs — Collaboration étendue" },
      { icon: Headphones, text: "Support expert — Assistance prioritaire avec rendez-vous trimestriels" },
      { icon: FileText, text: "Exports avancés PDF & Excel — Analyses détaillées" },
      { icon: Target, text: "Révisions illimitées — Suivi continu de vos émissions" },
      { icon: Target, text: "Plan d'action personnalisé — Accompagnement sur la mise en œuvre" },
      { icon: Zap, text: "Trajectoire de décarbonation — Feuille de route sur 5 ans" }
    ],
    limitations: [
      "Pas de support multi-sites",
      "Pas de hotline dédiée 24/7"
    ],
    cta: "Choisir CarboPlus",
    highlighted: true
  },
  {
    name: "CarboPro",
    target: "Grandes Entreprises, Groupes & Multi-sites",
    price: "Sur devis",
    period: "",
    description: "Grandes Entreprises, Groupes & Multi-sites - Accompagnement sur-mesure adapté aux exigences des grandes entreprises",
    features: [
      { icon: FileText, text: "Bilan Carbone complet — Scopes 1, 2 & 3" },
      { icon: Users, text: "Utilisateurs illimités — Collaboration inter-sites & inter-départements" },
      { icon: Headphones, text: "Support expert dédié — Hotline & rendez-vous mensuels" },
      { icon: FileText, text: "Exports PDF & Excel — Résultats détaillés" },
      { icon: Target, text: "Révisions personnalisées — Fréquence adaptée à votre organisation" },
      { icon: Target, text: "Plan d'action personnalisé — Accompagnement expert & suivi" },
      { icon: Zap, text: "Trajectoire Net Zero sur 10 ans — Plan chiffré avec étapes & jalons" },
      { icon: Building2, text: "Reporting consolidé multi-sites — Idéal pour groupes & filiales" }
    ],
    limitations: [],
    cta: "Demander un devis",
    highlighted: false
  }
];

export const CarboScanPlans: React.FC = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Nos Plans
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choisissez la solution adaptée à la taille et aux besoins de votre entreprise
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                plan.highlighted 
                  ? 'border-green-accent bg-green-accent/5 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-blue-primary/30 hover:shadow-md'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-accent text-white px-4 py-2 rounded-full text-sm font-medium">
                    Recommandé
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-primary mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
              </div>
              
              <div className="mb-8">
                <ul className="space-y-4 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-green-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-accent" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature.text}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.limitations && plan.limitations.length > 0 && (
                  <ul className="space-y-2">
                    {plan.limitations.map((limitation, limitationIndex) => (
                      <li key={limitationIndex} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-gray-400 text-xs">✕</span>
                        </div>
                        <span className="text-gray-500 text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <Button 
                className={`w-full ${
                  plan.highlighted 
                    ? 'bg-green-accent hover:bg-green-accent/90 text-white' 
                    : 'bg-primary hover:bg-primary/90 text-white'
                }`}
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};