/**
 * COLLECTEUR DE DONNÉES D'ACTIVITÉ - DESIGN PROFESSIONNEL
 * 
 * Interface épurée et professionnelle pour la collecte par Scope GHG Protocol
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, Zap, Globe2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import des composants par Scope
import { Scope1DataEntry } from './Scope1DataEntry';
import { Scope2DataEntry } from './Scope2DataEntry';
import { Scope3DataEntry } from '@/components/scope3/Scope3DataEntry';

type ScopeTab = 'scope1' | 'scope2' | 'scope3';

interface ActivityDataCollectorProps {
  defaultTab?: ScopeTab;
}

const SCOPE_INFO = {
  scope1: {
    title: 'Scope 1',
    subtitle: 'Émissions directes',
    description: 'Émissions provenant de sources détenues ou contrôlées par votre organisation',
    examples: 'Combustibles fossiles, carburants des véhicules, fluides frigorigènes',
    icon: Flame,
    color: 'text-red-600',
    badgeColor: 'bg-red-600',
  },
  scope2: {
    title: 'Scope 2',
    subtitle: 'Énergie indirecte',
    description: 'Émissions indirectes liées à la production d\'énergie achetée et consommée',
    examples: 'Électricité, chaleur, vapeur, froid achetés',
    icon: Zap,
    color: 'text-yellow-600',
    badgeColor: 'bg-yellow-600',
  },
  scope3: {
    title: 'Scope 3',
    subtitle: 'Autres émissions indirectes',
    description: 'Émissions indirectes qui se produisent dans votre chaîne de valeur',
    examples: 'Achats, déplacements professionnels, déchets, transport amont/aval',
    icon: Globe2,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-600',
  },
};

export const ActivityDataCollector: React.FC<ActivityDataCollectorProps> = ({ defaultTab = 'scope1' }) => {
  // Récupérer l'onglet depuis localStorage ou utiliser defaultTab
  const savedTab = localStorage.getItem('collecte-active-scope') as ScopeTab | null;
  const [activeTab, setActiveTab] = useState<ScopeTab>(savedTab || defaultTab);

  // Sauvegarder l'onglet actif dans localStorage
  const handleTabChange = (tab: string) => {
    const scopeTab = tab as ScopeTab;
    setActiveTab(scopeTab);
    localStorage.setItem('collecte-active-scope', scopeTab);
  };

  const currentScope = SCOPE_INFO[activeTab];
  const Icon = currentScope.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête avec gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">Collecte de données d'activité</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez vos émissions selon la méthodologie GHG Protocol
          </p>
        </div>
      </div>

      {/* Sélection des Scopes */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        
        {/* Onglets Scope redessinés - Cartes distinctes */}
        <TabsList className="grid w-full grid-cols-3 h-auto p-2 gap-3 bg-transparent">
          {/* SCOPE 1 */}
          <TabsTrigger 
            value="scope1" 
            className={`
              relative flex-col py-5 px-4 rounded-xl border-2 transition-all duration-200
              ${activeTab === 'scope1' 
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400 shadow-lg shadow-red-100 scale-[1.02]' 
                : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/30'
              }
            `}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
              ${activeTab === 'scope1' 
                ? 'bg-red-500 shadow-md' 
                : 'bg-red-100'
              }
            `}>
              <Flame className={`w-6 h-6 ${activeTab === 'scope1' ? 'text-white' : 'text-red-500'}`} />
            </div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`font-bold text-base ${activeTab === 'scope1' ? 'text-red-700' : 'text-slate-700'}`}>
                Scope 1
              </span>
              <Badge className={`
                h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center
                ${activeTab === 'scope1' ? 'bg-red-500' : 'bg-red-400'}
              `}>
                1
              </Badge>
            </div>
            <span className={`text-xs ${activeTab === 'scope1' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
              Directes
            </span>
            {activeTab === 'scope1' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-red-400" />
            )}
          </TabsTrigger>

          {/* SCOPE 2 */}
          <TabsTrigger 
            value="scope2" 
            className={`
              relative flex-col py-5 px-4 rounded-xl border-2 transition-all duration-200
              ${activeTab === 'scope2' 
                ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 shadow-lg shadow-amber-100 scale-[1.02]' 
                : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
              }
            `}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
              ${activeTab === 'scope2' 
                ? 'bg-amber-500 shadow-md' 
                : 'bg-amber-100'
              }
            `}>
              <Zap className={`w-6 h-6 ${activeTab === 'scope2' ? 'text-white' : 'text-amber-500'}`} />
            </div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`font-bold text-base ${activeTab === 'scope2' ? 'text-amber-700' : 'text-slate-700'}`}>
                Scope 2
              </span>
              <Badge className={`
                h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center
                ${activeTab === 'scope2' ? 'bg-amber-500' : 'bg-amber-400'}
              `}>
                2
              </Badge>
            </div>
            <span className={`text-xs ${activeTab === 'scope2' ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
              Énergie
            </span>
            {activeTab === 'scope2' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-amber-400" />
            )}
          </TabsTrigger>

          {/* SCOPE 3 */}
          <TabsTrigger 
            value="scope3" 
            className={`
              relative flex-col py-5 px-4 rounded-xl border-2 transition-all duration-200
              ${activeTab === 'scope3' 
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 shadow-lg shadow-blue-100 scale-[1.02]' 
                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
              }
            `}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
              ${activeTab === 'scope3' 
                ? 'bg-blue-500 shadow-md' 
                : 'bg-blue-100'
              }
            `}>
              <Globe2 className={`w-6 h-6 ${activeTab === 'scope3' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`font-bold text-base ${activeTab === 'scope3' ? 'text-blue-700' : 'text-slate-700'}`}>
                Scope 3
              </span>
              <Badge className={`
                h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center
                ${activeTab === 'scope3' ? 'bg-blue-500' : 'bg-blue-400'}
              `}>
                3
              </Badge>
            </div>
            <span className={`text-xs ${activeTab === 'scope3' ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
              Indirectes
            </span>
            {activeTab === 'scope3' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-400" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Bandeau d'information du Scope actif */}
        <Card className="border-l-4" style={{ borderLeftColor: currentScope.color.replace('text-', '#') }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-3 rounded-lg ${currentScope.badgeColor} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${currentScope.color}`} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{currentScope.title} - {currentScope.subtitle}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentScope.description}
                </p>
                <div className="flex items-start gap-2 pt-1">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Exemples : </span>
                    {currentScope.examples}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Contenu des onglets */}
        <TabsContent value="scope1" className="mt-0 space-y-6">
          <Scope1DataEntry />
        </TabsContent>

        <TabsContent value="scope2" className="mt-0 space-y-6">
          <Scope2DataEntry />
        </TabsContent>

        <TabsContent value="scope3" className="mt-0 space-y-6">
          <Scope3DataEntry />
        </TabsContent>
      </Tabs>
    </div>
  );
};
