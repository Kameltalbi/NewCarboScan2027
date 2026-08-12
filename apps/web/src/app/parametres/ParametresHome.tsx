// Page d'accueil du module Paramètres

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2,
  Users,
  Database,
  CreditCard,
  ArrowRight,
  Settings
} from 'lucide-react';

export const ParametresHome: React.FC = () => {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      id: 'organisation',
      title: 'Organisation',
      description: 'Gérez les informations de votre organisation, secteur d\'activité, sites et statistiques consolidées',
      icon: Building2,
      color: 'blue',
      path: '/organisation',
      features: [
        'Informations générales',
        'Secteur d\'activité et pays',
        'Sites et localisations',
        'Statistiques consolidées (auto)',
        'Données pour rapports'
      ]
    },
    {
      id: 'utilisateurs',
      title: 'Utilisateurs et équipes',
      description: 'Gérez les utilisateurs, leurs rôles et permissions d\'accès',
      icon: Users,
      color: 'green',
      path: '/utilisateurs',
      features: [
        'Gestion des utilisateurs',
        'Rôles et permissions',
        'Équipes et départements',
        'Invitations'
      ]
    },
    {
      id: 'sources',
      title: 'Sources de données',
      description: 'Configurez vos sources de données et facteurs d\'émission',
      icon: Database,
      color: 'purple',
      path: '/sources',
      features: [
        'Facteurs d\'émission',
        'Bases de données',
        'Sources personnalisées',
        'Imports automatiques'
      ]
    },
    {
      id: 'abonnement',
      title: 'Abonnement',
      description: 'Gérez votre abonnement, facturation et consommation',
      icon: CreditCard,
      color: 'orange',
      path: '/abonnement',
      features: [
        'Plan actuel',
        'Facturation',
        'Historique des paiements',
        'Consommation'
      ]
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Settings className="h-8 w-8 text-slate-600" />
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        </div>
        <p className="text-muted-foreground">
          Configurez votre organisation, vos utilisateurs et vos préférences
        </p>
      </div>

      {/* Catégories de paramètres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          const colors = getColorClasses(category.color);
          
          return (
            <Card 
              key={category.id}
              className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
              onClick={() => navigate(`/app/parametres${category.path}`)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className={`p-3 ${colors.bg} rounded-lg w-fit`}>
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {category.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/parametres${category.path}`);
                    }}
                  >
                    Configurer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Message d'aide */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-sm text-slate-900">
          <strong>💡 Conseil :</strong> Commencez par configurer votre organisation et ajouter vos sites. 
          Les totaux (employés, surface) seront calculés automatiquement pour alimenter vos rapports Bilan Carbone.
        </p>
      </div>
    </div>
  );
};
