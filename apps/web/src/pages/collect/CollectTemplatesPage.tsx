import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  Download, 
  Zap, 
  Droplets, 
  Trash2, 
  ShoppingCart, 
  Truck,
  Building2,
  Leaf,
  Factory,
  Info
} from 'lucide-react';
import { ExcelImportService } from '@/lib/ai/excelImportService';
import { generateCollecteExcel } from '@/utils/excelGenerator';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExcelTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  columns: string[];
  color: string;
}

const templates: ExcelTemplate[] = [
  {
    id: 'energy',
    name: 'Énergie',
    description: 'Suivi des consommations électricité, gaz, fioul et autres énergies',
    icon: Zap,
    category: 'Scope 1 & 2',
    columns: ['Période', 'Électricité (kWh)', 'Gaz naturel (m³)', 'Fioul (litres)', 'Autre énergie (kWh)', 'Commentaire'],
    color: 'bg-amber-500'
  },
  {
    id: 'transport',
    name: 'Transport & Déplacements',
    description: 'Flotte de véhicules, déplacements professionnels, trajets domicile-travail',
    icon: Truck,
    category: 'Scope 1 & 3',
    columns: ['Date', 'Type véhicule', 'Distance (km)', 'Carburant (litres)', 'Nombre trajets', 'Commentaire'],
    color: 'bg-blue-500'
  },
  {
    id: 'purchases',
    name: 'Achats & Approvisionnements',
    description: 'Achats de biens et services, matières premières, équipements',
    icon: ShoppingCart,
    category: 'Scope 3',
    columns: ['Date', 'Fournisseur', 'Catégorie', 'Montant (€)', 'Quantité', 'Unité', 'Commentaire'],
    color: 'bg-purple-500'
  },
  {
    id: 'waste',
    name: 'Déchets',
    description: 'Gestion des déchets, recyclage, traitement et élimination',
    icon: Trash2,
    category: 'Scope 3',
    columns: ['Date', 'Type déchet', 'Quantité (tonnes)', 'Mode traitement', 'Coût (€)', 'Commentaire'],
    color: 'bg-green-500'
  },
  {
    id: 'water',
    name: 'Eau',
    description: 'Consommation d\'eau potable, eaux usées, rejets',
    icon: Droplets,
    category: 'Ressources',
    columns: ['Période', 'Consommation eau (m³)', 'Coût (€)', 'Source', 'Commentaire'],
    color: 'bg-cyan-500'
  },
  {
    id: 'buildings',
    name: 'Bâtiments & Sites',
    description: 'Données des sites, surfaces, équipements, climatisation',
    icon: Building2,
    category: 'Scope 1 & 2',
    columns: ['Site', 'Adresse', 'Surface (m²)', 'Effectif', 'Type chauffage', 'Type climatisation'],
    color: 'bg-slate-500'
  },
  {
    id: 'refrigerants',
    name: 'Fluides Frigorigènes',
    description: 'Recharges et fuites de gaz réfrigérants (climatisation, froid)',
    icon: Factory,
    category: 'Scope 1',
    columns: ['Date', 'Équipement', 'Type fluide', 'Quantité rechargée (kg)', 'Fuites estimées (kg)', 'Commentaire'],
    color: 'bg-indigo-500'
  },
  {
    id: 'biodiversity',
    name: 'Biodiversité & Environnement',
    description: 'Espaces verts, compensation carbone, actions environnementales',
    icon: Leaf,
    category: 'ESG',
    columns: ['Action', 'Date', 'Surface concernée (m²)', 'Type intervention', 'Impact estimé', 'Commentaire'],
    color: 'bg-emerald-500'
  }
];

const CollectTemplatesPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadTemplate = async (templateId: string) => {
    try {
      setDownloading(templateId);
      await ExcelImportService.generateCategoryTemplate(templateId);
      toast.success('Template téléchargé avec succès');
    } catch (error) {
      console.error('Erreur téléchargement template:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadGlobalTemplate = async () => {
    try {
      setDownloading('global');
      const blob = await generateCollecteExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tableau-collecte-donnees-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template global téléchargé avec succès');
    } catch (error) {
      console.error('Erreur téléchargement template global:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Templates Excel Spécialisés
          </h1>
          <p className="text-muted-foreground mt-1">
            Téléchargez des modèles Excel pré-formatés pour faciliter la collecte de vos données
          </p>
        </div>
        
        <Button 
          onClick={handleDownloadGlobalTemplate}
          disabled={downloading === 'global'}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {downloading === 'global' ? 'Téléchargement...' : 'Template Global'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Comment utiliser les templates ?</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Téléchargez le template correspondant à vos données</li>
                <li>Remplissez les colonnes avec vos données réelles</li>
                <li>Importez le fichier via la fonction "Imports & Fichiers"</li>
                <li>L'IA CarboScan analysera et validera automatiquement vos données</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.map((template) => {
          const IconComponent = template.icon;
          const isDownloading = downloading === template.id;
          
          return (
            <Card 
              key={template.id} 
              className="hover:shadow-md transition-shadow flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${template.color}`}>
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                          Colonnes incluses :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.columns.slice(0, 3).map((col, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-xs font-normal"
                            >
                              {col}
                            </Badge>
                          ))}
                          {template.columns.length > 3 && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              +{template.columns.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium mb-1">Toutes les colonnes :</p>
                      <ul className="text-xs list-disc list-inside">
                        {template.columns.map((col, idx) => (
                          <li key={idx}>{col}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => handleDownloadTemplate(template.id)}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? 'Téléchargement...' : 'Télécharger'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Templates personnalisés</CardTitle>
          <CardDescription>
            Besoin d'un template spécifique à votre secteur d'activité ? 
            Contactez notre équipe support pour obtenir un modèle adapté.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            Demander un template personnalisé
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectTemplatesPage;
