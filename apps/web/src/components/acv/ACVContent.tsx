import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target, BarChart3, TrendingUp, Recycle, Factory, Truck, ShoppingBag, ArrowRight } from "lucide-react";

export const ACVContent = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Introduction - Définition ACV */}
          <div className="mb-16">
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                L'Analyse de Cycle de Vie (ACV) est une méthode normalisée qui permet d'évaluer les impacts environnementaux d'un produit ou service tout au long de son existence :
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <Card className="group hover:shadow-lg transition-all duration-300 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Factory className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Extraction des matières premières</p>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 border-green-200">
                  <CardContent className="p-4 text-center">
                    <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Fabrication</p>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Truck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Transport et distribution</p>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 border-green-200">
                  <CardContent className="p-4 text-center">
                    <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Phase d'utilisation</p>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Recycle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Fin de vie</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200">
                <p className="text-lg font-medium text-blue-800 mb-2">👉 Contrairement à un simple bilan carbone</p>
                <p className="text-muted-foreground">
                  l'ACV prend en compte l'ensemble des étapes du cycle de vie et mesure plusieurs types d'impacts (émissions de CO₂, consommation d'énergie, utilisation de l'eau, pollution, etc.).
                </p>
              </div>
            </div>
          </div>

          {/* Pourquoi réaliser une ACV */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-blue-800">
              Pourquoi réaliser une ACV ?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="group hover:shadow-lg transition-all duration-300 border-blue-200">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-blue-800">
                    Conformité réglementaire
                  </h3>
                  <p className="text-muted-foreground">
                    Répondre aux exigences de plus en plus strictes (marchés publics, labels, normes ISO).
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-green-200">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-green-800">
                    Transparence et crédibilité
                  </h3>
                  <p className="text-muted-foreground">
                    Communiquer des chiffres fiables à vos clients, partenaires et investisseurs.
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-blue-200">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-blue-800">
                    Avantage compétitif
                  </h3>
                  <p className="text-muted-foreground">
                    Différencier vos produits sur des critères de durabilité mesurables.
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-green-200">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-green-800">
                    Optimisation des coûts
                  </h3>
                  <p className="text-muted-foreground">
                    Identifier les étapes les plus impactantes et réduire la consommation de ressources.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Notre approche ACV */}
          <div className="mb-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-green-800">
                Notre approche ACV avec Carboscan
              </h2>
              
              <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
                <CardContent className="p-8">
                  <p className="text-lg text-center mb-8 text-muted-foreground">
                    Nous vous accompagnons à chaque étape :
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">Définition du périmètre</h4>
                        <p className="text-muted-foreground">Choix du produit, des frontières du système, des catégories d'impact à analyser.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">Collecte des données</h4>
                        <p className="text-muted-foreground">Matières premières, procédés de fabrication, consommations énergétiques, transport, etc.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">Modélisation et calcul</h4>
                        <p className="text-muted-foreground">Application des bases de données reconnues (Ecoinvent, ADEME, etc.) et des méthodologies ISO 14040/14044.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">Analyse des résultats</h4>
                        <p className="text-muted-foreground">Identification des points critiques (hotspots) et hiérarchisation des leviers d'action.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">5</div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">Restitution et plan d'action</h4>
                        <p className="text-muted-foreground">Rapport pédagogique avec recommandations pour réduire l'impact et améliorer la durabilité.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Exemple concret */}
          <div className="mb-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-blue-800">
                Exemple concret d'application
              </h2>
              
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <CardContent className="p-8">
                  <div className="bg-white p-6 rounded-lg border border-green-200 mb-6">
                    <p className="text-lg font-semibold text-green-800 mb-4">
                      👉 Une entreprise textile tunisienne souhaite comparer deux modèles de t-shirts (coton conventionnel vs coton biologique).
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                      <p className="text-muted-foreground">
                        L'ACV révèle que la phase de culture du coton concentre 60 % des impacts environnementaux (eau, pesticides, CO₂).
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <ArrowRight className="w-5 h-5 text-green-600" />
                      <p className="text-muted-foreground">
                        En optant pour du coton bio + une logistique optimisée, l'entreprise réduit de 30 % l'empreinte carbone et valorise cette amélioration auprès de ses clients exportateurs.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ACV + Bilan Carbone */}
          <div className="mb-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-green-800">
                ACV + Bilan Carbone : une synergie stratégique
              </h2>
              
              <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
                <CardContent className="p-8">
                  <p className="text-lg text-center mb-8 text-muted-foreground">
                    Le bilan carbone mesure les émissions globales d'une organisation, tandis que l'ACV se concentre sur un produit ou service spécifique. Ensemble, ces deux outils offrent une vision complète :
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-3">Vision macro</h4>
                      <p className="text-muted-foreground">(organisation, scopes 1–2–3)</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-3">Vision micro</h4>
                      <p className="text-muted-foreground">(impact détaillé par produit/service)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Passez à l'action */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  Passez à l'action
                </h2>
                <p className="text-lg mb-8 opacity-90">
                  Avec Carboscan, transformez vos produits en avantages compétitifs durables grâce à l'Analyse de Cycle de Vie.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};