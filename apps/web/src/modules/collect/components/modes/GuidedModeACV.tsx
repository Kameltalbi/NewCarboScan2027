// Mode guidé ACV Simple
// Réutilise ProductWizard mais avec un contexte ACV simplifiée
// Les données sont sauvegardées dans activity_data avec les catégories lifecycle_*

import React from 'react';
import { ProductWizard } from '@/modules/empreinte-produit/components/ProductWizard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface GuidedModeACVProps {
  organizationId: string;
}

export const GuidedModeACV: React.FC<GuidedModeACVProps> = ({ organizationId }) => {
  return (
    <div className="space-y-6">
      {/* Avertissement ACV Simplifiée */}
      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>ACV Simplifiée</strong> - Ce module permet d'analyser un produit selon une logique cycle de vie simplifiée.
          Les données collectées seront organisées par phase du cycle de vie (matières, fabrication, transport, usage, fin de vie).
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900">
          <strong>Note importante :</strong> Cette analyse ne promet pas de conformité ISO 14040/14044 et n'utilise pas de bases de données 
          professionnelles (Brightway, Ecoinvent). Elle est destinée aux utilisateurs souhaitant une analyse simplifiée avec 1 à 3 indicateurs maximum.
          Les hypothèses et limites sont explicites dans les résultats.
        </AlertDescription>
      </Alert>

      {/* Informations sur le périmètre ACV */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">Périmètre de l'analyse</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cette ACV simplifiée couvre les phases suivantes du cycle de vie :
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li><strong>Matières premières</strong> : Extraction et transformation des matières</li>
            <li><strong>Fabrication</strong> : Processus de production et énergie nécessaire</li>
            <li><strong>Transport</strong> : Distribution du produit</li>
            <li><strong>Utilisation</strong> : Consommation énergétique pendant l'usage (optionnel)</li>
            <li><strong>Fin de vie</strong> : Traitement en fin de vie (optionnel)</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Les données collectées seront automatiquement catégorisées selon ces phases et sauvegardées dans la base centrale.
          </p>
        </CardContent>
      </Card>

      {/* ProductWizard réutilisé */}
      <ProductWizard />
    </div>
  );
};

