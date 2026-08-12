// Cartes services orientées vers la collecte de données
// Chaque service déclenche une collecte spécialisée

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Package, Leaf, Target, ArrowRight, Database } from 'lucide-react';

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  ctaText: string;
  collectType: 'bilan-carbone' | 'produit' | 'acv' | 'net-zero';
}

export const PricingServicesCards: React.FC = () => {
  const navigate = useNavigate();

  const services: ServiceCard[] = [
    {
      id: 'bilan-carbone',
      title: 'Bilan Carbone',
      description: 'Collectez vos données d\'activité globale (énergie, transport, achats, déchets) pour calculer l\'impact de votre entreprise selon les Scopes 1, 2 et 3.',
      icon: BarChart3,
      ctaText: 'Lancer la collecte Bilan Carbone',
      collectType: 'bilan-carbone',
    },
    {
      id: 'empreinte-produit',
      title: 'Empreinte Carbone Produit',
      description: 'Collectez les données spécifiques à un produit (matières, fabrication, transport, usage, fin de vie) pour calculer son empreinte carbone par unité fonctionnelle.',
      icon: Package,
      ctaText: 'Lancer la collecte produit',
      collectType: 'produit',
    },
    {
      id: 'acv',
      title: 'ACV (Analyse du Cycle de Vie)',
      description: 'Collectez les données selon les phases du cycle de vie pour une analyse environnementale simplifiée de vos produits.',
      icon: Leaf,
      ctaText: 'Configurer une collecte ACV',
      collectType: 'acv',
    },
    {
      id: 'net-zero',
      title: 'Net Zéro',
      description: 'Collectez vos données sur plusieurs années pour suivre votre trajectoire de décarbonation et atteindre le Net Zéro.',
      icon: Target,
      ctaText: 'Démarrer la collecte Net Zéro',
      collectType: 'net-zero',
    },
  ];

  const handleServiceClick = (collectType: string) => {
    // Rediriger vers la collecte avec le paramètre mode
    // Le ModuleProtectedRoute gérera la redirection vers /auth si l'utilisateur n'est pas connecté
    // Puis redirigera vers la collecte avec le paramètre préservé
    navigate(`/app/collecte?mode=${collectType}`);
  };

  return (
    <section className="py-16 bg-white">
      <div className="w-full px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* En-tête */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nos services d'analyse carbone
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Toutes les analyses CarboScan reposent sur une base de données centrale.
              Chaque service déclenche une collecte de données spécialisée adaptée à votre objectif.
            </p>
          </div>

          {/* Cartes services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.id}
                  className="border-2 hover:shadow-xl transition-all cursor-pointer hover:border-primary/30"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl font-semibold">{service.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {service.description}
                    </p>
                    <Button
                      onClick={() => handleServiceClick(service.collectType)}
                      className="w-full"
                      size="lg"
                    >
                      {service.ctaText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Message explicatif */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Database className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Une seule collecte, plusieurs analyses
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Toutes les analyses CarboScan reposent sur une base de données centrale.
                    Vous collectez vos données une seule fois, et vous pouvez les utiliser pour tous vos modules d'analyse.
                    La collecte s'adapte automatiquement selon votre objectif (Bilan Carbone, Empreinte Produit, ACV, Net Zéro).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

