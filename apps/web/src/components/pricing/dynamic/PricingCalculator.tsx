import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Module {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface PricingCalculatorProps {
  selectedModules: string[];
  modules: Module[];
  totalPrice: number;
  isEnterprise: boolean;
  entities?: number;
}

const modules: Module[] = [
  {
    id: 'carbon',
    name: 'CarboScan Carbon',
    price: 2000,
    description: 'Bilan carbone complet Scopes 1, 2 & 3'
  },
  {
    id: 'collect',
    name: 'CarboScan Collect',
    price: 2400,
    description: 'Collecte automatisée de données'
  },
  {
    id: 'acv',
    name: 'ACV Produit / CBAM',
    price: 2900,
    description: 'Analyse du cycle de vie et conformité CBAM'
  },
  {
    id: 'csrd',
    name: 'CSRD Dataroom',
    price: 3900,
    description: 'Conformité CSRD et reporting ESG'
  },
  {
    id: 'api',
    name: 'API Connect',
    price: 3500,
    description: 'Intégration API et connecteurs ERP'
  },
  {
    id: 'academy',
    name: 'Academy',
    price: 600,
    description: 'Formation par utilisateur'
  },
  {
    id: 'decarbotech',
    name: 'Monitoring & Réduction – Capteurs & automatisation énergétique',
    price: 900,
    description: 'Capteurs & automatisation énergétique'
  }
];

export const getModulePrice = (moduleId: string, academyUsers: number = 0): number => {
  const module = modules.find(m => m.id === moduleId);
  if (!module) return 0;
  
  if (moduleId === 'academy') {
    return module.price * academyUsers;
  }
  
  return module.price;
};

export const getEntityUnitPrice = (entities: number): number => {
  if (entities <= 1) return 0;
  if (entities <= 3) return 1200;
  if (entities <= 6) return 1000;
  return 800; // 7-10
};

export const calculateEntityPrice = (entities: number): number => {
  if (entities <= 1) return 0;
  const extra = entities - 1;
  const tier1 = Math.min(extra, 2) * 1200;      // entities 2-3
  const tier2 = Math.min(Math.max(extra - 2, 0), 3) * 1000;  // entities 4-6
  const tier3 = Math.min(Math.max(extra - 5, 0), 4) * 800;   // entities 7-10
  return tier1 + tier2 + tier3;
};

export const calculateTotal = (
  selectedModules: string[],
  academyUsers: number = 0,
  hasScope3: boolean = false,
  entities: number = 1
): number => {
  let total = 0;
  
  selectedModules.forEach(moduleId => {
    if (moduleId === 'academy') {
      total += getModulePrice(moduleId, academyUsers);
    } else {
      total += getModulePrice(moduleId);
    }
  });
  
  // Add Scope 3 premium if applicable
  if (hasScope3 && selectedModules.includes('carbon')) {
    total += 900;
  }
  
  // Add entity pricing
  total += calculateEntityPrice(entities);
  
  return total;
};

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  selectedModules,
  modules: propsModules,
  totalPrice,
  isEnterprise,
  entities = 1
}) => {
  const displayModules = propsModules.length > 0 ? propsModules : modules;

  if (isEnterprise) {
    return (
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-700">Profil Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Votre organisation bénéficie d'un accompagnement personnalisé.
          </p>
          <p className="text-gray-700">
            Un expert CarboScan vous contactera pour une proposition adaptée à vos besoins.
          </p>
          <Badge className="w-fit bg-blue-100 text-blue-700 border-blue-200">
            Accompagnement personnalisé
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-[#009879]">
      <CardHeader>
        <CardTitle className="text-[#009879]">Récapitulatif des prix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayModules
          .filter(m => selectedModules.includes(m.id))
          .map((module) => (
            <div
              key={module.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start gap-3 flex-1">
                <Check className="w-5 h-5 text-[#009879] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{module.name}</p>
                  <p className="text-sm text-gray-600">{module.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#009879]">
                  {module.id === 'academy' ? '600 DT/user' : `${module.price} DT`}
                </p>
              </div>
            </div>
          ))}

        {entities > 1 && (
          <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3 flex-1">
              <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Entités supplémentaires</p>
                <p className="text-sm text-muted-foreground">{entities - 1} × {getEntityUnitPrice(entities).toLocaleString('fr-FR')} DT</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">
                +{calculateEntityPrice(entities).toLocaleString('fr-FR')} DT
              </p>
            </div>
          </div>
        )}
        
        {selectedModules.length === 0 && entities <= 1 && (
          <p className="text-center text-muted-foreground py-8">
            Sélectionnez des modules pour voir les prix
          </p>
        )}

        {(selectedModules.length > 0 || entities > 1) && (
          <div className="pt-4 border-t-2 border-primary">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                {totalPrice.toLocaleString('fr-FR')} DT
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">HT / an</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { modules as defaultModules };

