import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { Calculator, TrendingUp, AlertTriangle, Target, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const CBAM: React.FC = () => {
  const { i18n } = useTranslation();
  const isFrench = i18n.language === 'fr';

  const sectorsData = [
    { name: isFrench ? "Ciment" : "Cement", icon: "🏗️" },
    { name: isFrench ? "Fer et acier" : "Iron & Steel", icon: "⚔️" },
    { name: isFrench ? "Aluminium" : "Aluminum", icon: "🔧" },
    { name: isFrench ? "Engrais" : "Fertilizers", icon: "🌱" },
    { name: isFrench ? "Électricité" : "Electricity", icon: "⚡" },
    { name: isFrench ? "Hydrogène" : "Hydrogen", icon: "💨" }
  ];

  const impactsData = [
    {
      title: isFrench ? "Risque de surcoûts" : "Risk of additional costs",
      description: isFrench ? "Taxe carbone pouvant aller jusqu'à 100€/tonne CO₂" : "Carbon tax up to €100/ton CO₂",
      icon: <TrendingUp className="h-6 w-6 text-red-600" />
    },
    {
      title: isFrench ? "Obligation de transparence" : "Transparency requirement",
      description: isFrench ? "Déclaration obligatoire des émissions carbone" : "Mandatory carbon emissions reporting",
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />
    },
    {
      title: isFrench ? "Valeurs par défaut pénalisantes" : "Penalizing default values",
      description: isFrench ? "Sans données fiables, les valeurs les plus élevées s'appliquent" : "Without reliable data, highest values apply",
      icon: <Target className="h-6 w-6 text-blue-600" />
    }
  ];

  return (
    <SolutionLandingShell path="/cbam">
      <div className="bg-gradient-to-br from-slate-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-800 px-4 py-2 text-sm font-medium">
            {isFrench ? "Réglementation européenne 2026" : "European regulation 2026"}
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            {isFrench ? "MACF – Taxe Carbone aux Frontières" : "CBAM – Carbon Border Tax"}
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
            {isFrench ? (
              "Cette réglementation européenne entrera en vigueur en 2026 et concerne les importations à forte intensité carbone. Découvrez comment vous préparer dès maintenant."
            ) : (
              "This European regulation will come into effect in 2026 and concerns carbon-intensive imports. Discover how to prepare now."
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/cbam-calculator">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold shadow-lg">
                🚀 {isFrench ? "Estimez vos coûts carbone avec notre calculateur" : "Estimate your carbon costs with our calculator"}
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg font-semibold border-2">
                {isFrench ? "Nous contacter" : "Contact us"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Objectives Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isFrench ? "Objectifs du CBAM" : "CBAM Objectives"}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {isFrench ? (
                "Le mécanisme d'ajustement carbone aux frontières vise à créer un niveau de jeu équitable mondial."
              ) : (
                "The carbon border adjustment mechanism aims to create a level playing field globally."
              )}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <CardContent className="p-8">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {isFrench ? "Réduire les émissions" : "Reduce emissions"}
                </h3>
                <p className="text-gray-600">
                  {isFrench ? (
                    "Inciter à la réduction globale des émissions de CO₂"
                  ) : (
                    "Encourage global CO₂ emissions reduction"
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardContent className="p-8">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {isFrench ? "Éviter les fuites carbone" : "Avoid carbon leakage"}
                </h3>
                <p className="text-gray-600">
                  {isFrench ? (
                    "Empêcher le déplacement de la production vers des pays moins contraignants"
                  ) : (
                    "Prevent production relocation to less stringent countries"
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-8">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {isFrench ? "Protéger la compétitivité" : "Protect competitiveness"}
                </h3>
                <p className="text-gray-600">
                  {isFrench ? (
                    "Maintenir la compétitivité des entreprises européennes"
                  ) : (
                    "Maintain European companies' competitiveness"
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Sectors Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isFrench ? "Secteurs concernés" : "Affected sectors"}
            </h2>
            <p className="text-lg text-gray-600">
              {isFrench ? (
                "Ces secteurs seront les premiers impactés, d'autres suivront progressivement"
              ) : (
                "These sectors will be the first impacted, others will follow gradually"
              )}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {sectorsData.map((sector, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-4xl mb-3">{sector.icon}</div>
                  <h3 className="font-semibold text-sm">{sector.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Badge variant="outline" className="px-4 py-2">
              {isFrench ? (
                "D'autres secteurs seront ajoutés progressivement"
              ) : (
                "Other sectors will be added progressively"
              )}
            </Badge>
          </div>
        </section>

        {/* Impacts Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isFrench ? (
                "Impacts pour les exportateurs tunisiens et africains"
              ) : (
                "Impacts for Tunisian and African exporters"
              )}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {isFrench ? (
                "Comprendre les enjeux pour mieux s'y préparer et transformer la contrainte en opportunité."
              ) : (
                "Understanding the challenges to better prepare and transform constraints into opportunities."
              )}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {impactsData.map((impact, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {impact.icon}
                    <h3 className="text-xl font-semibold ml-3">{impact.title}</h3>
                  </div>
                  <p className="text-gray-600">{impact.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Solution Section */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0">
            <CardContent className="p-12 text-center">
              <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Calculator className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {isFrench ? "Notre solution : Le calculateur carbone" : "Our solution: Carbon calculator"}
              </h2>
              <p className="text-lg text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed">
                {isFrench ? (
                  "Notre calculateur carbone vous permet d'estimer précisément les émissions par produit, d'évaluer les coûts potentiels du CBAM et d'identifier des pistes concrètes de réduction. Anticipez les exigences réglementaires et sécurisez vos exportations vers l'Europe."
                ) : (
                  "Our carbon calculator allows you to precisely estimate emissions per product, evaluate potential CBAM costs and identify concrete reduction opportunities. Anticipate regulatory requirements and secure your exports to Europe."
                )}
              </p>
              
              <Link to="/cbam-calculator">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold shadow-lg">
                  🚀 {isFrench ? "Estimez vos coûts carbone avec notre calculateur" : "Estimate your carbon costs with our calculator"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-white rounded-2xl p-12 shadow-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {isFrench ? "Agissez dès maintenant" : "Act now"}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            {isFrench ? (
              "Le CBAM représente un défi majeur mais aussi une opportunité de modernisation. Les entreprises qui s'y préparent dès aujourd'hui prendront une longueur d'avance sur leurs concurrents et sécuriseront leurs exportations vers l'Europe. Ne laissez pas cette réglementation fragiliser votre activité : transformez-la en avantage concurrentiel."
            ) : (
              "CBAM represents a major challenge but also a modernization opportunity. Companies that prepare today will gain an advantage over their competitors and secure their exports to Europe. Don't let this regulation weaken your business: transform it into a competitive advantage."
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/cbam-calculator">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                {isFrench ? "Calculateur carbone" : "Carbon calculator"}
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="px-8 py-3">
                {isFrench ? "Nous contacter" : "Contact us"}
              </Button>
            </Link>
          </div>
        </section>
      </div>
      </div>
    </SolutionLandingShell>
  );
};

export default CBAM;