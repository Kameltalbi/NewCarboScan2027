import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Edit2, Trash2, FileQuestion } from 'lucide-react';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';

interface ActivityDataRow {
  id: string;
  category: string;
  activity_type: string;
  subcategory?: string | null;
  period_start: string;
  period_end: string;
  quantity: number;
  unit: string;
  data_quality: string;
  site_id?: string | null;
}

interface CollectDataTableProps {
  data: ActivityDataRow[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  scope1: 'Scope 1',
  scope2: 'Scope 2',
  scope3_upstream: 'Scope 3 amont',
  scope3_downstream: 'Scope 3 aval',
  energy: 'Énergie',
  transport: 'Transport',
  purchases: 'Achats',
  waste: 'Déchets',
  water: 'Eau',
  other: 'Autre',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  energy: 'Électricité',
  fuel: 'Carburant',
  transport: 'Transport',
  purchase: 'Achats',
  material: 'Matériaux',
  waste: 'Déchets',
  service: 'Services',
  usage: 'Usage',
  product_component: 'Composants',
  natural_gas: 'Gaz naturel',
  electricity: 'Électricité',
  water: 'Eau',
  refrigerant: 'Fluide frigorigène',
};

// Sous-catégories de carburant
const FUEL_SUBCATEGORIES: Record<string, string> = {
  essence: 'Essence',
  essence_sans_plomb: 'Essence sans plomb',
  gasoil: 'Gasoil (Diesel)',
  gasoil_super: 'Gasoil super',
  gpl: 'GPL',
};

// Fluides frigorigènes (réfrigérants)
const REFRIGERANT_SUBCATEGORIES: Record<string, string> = {
  r410a: 'R410A',
  r22: 'R22',
  r134a: 'R134a',
  r32: 'R32',
  r407c: 'R407C',
  r404a: 'R404A',
};

// Fonction pour déterminer le libellé correct
const getActivityLabel = (activityType: string, subcategory?: string | null): { main: string; sub?: string } => {
  // Si c'est un fluide frigorigène (subcategory est un réfrigérant)
  if (subcategory && REFRIGERANT_SUBCATEGORIES[subcategory]) {
    return { main: 'Fluide frigorigène', sub: REFRIGERANT_SUBCATEGORIES[subcategory] };
  }
  
  // Si c'est un carburant avec sous-catégorie
  if (subcategory && FUEL_SUBCATEGORIES[subcategory]) {
    return { main: 'Carburant', sub: FUEL_SUBCATEGORIES[subcategory] };
  }
  
  // Sinon, libellé standard
  return { 
    main: ACTIVITY_TYPE_LABELS[activityType] || activityType,
    sub: subcategory || undefined
  };
};

const QUALITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  measured: { label: 'Mesuré', variant: 'default' },
  estimated: { label: 'Estimé', variant: 'secondary' },
  calculated: { label: 'Calculé', variant: 'outline' },
  real: { label: 'Réel', variant: 'default' },
  default: { label: 'Par défaut', variant: 'outline' },
};

export const CollectDataTable: React.FC<CollectDataTableProps> = ({
  data,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { sites } = useOrganizationSites();

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  };

  if (data.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-12 text-center bg-muted/20">
        <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucune donnée disponible pour cette période.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4"
          onClick={() => navigate('/app/collecte/nouvelle')}
        >
          Ajouter une donnée
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-medium">Type de donnée</TableHead>
            <TableHead className="font-medium">Site</TableHead>
            <TableHead className="font-medium">Période</TableHead>
            <TableHead className="font-medium text-right">Valeur</TableHead>
            <TableHead className="font-medium">Unité</TableHead>
            <TableHead className="font-medium">Statut</TableHead>
            <TableHead className="font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 10).map((row) => {
            const qualityConfig = QUALITY_CONFIG[row.data_quality] || QUALITY_CONFIG.estimated;
            const activityLabel = getActivityLabel(row.activity_type, row.subcategory);
            return (
              <TableRow key={row.id} className="hover:bg-muted/20">
                <TableCell>
                  <span className="font-medium text-foreground">
                    {activityLabel.main}
                    {activityLabel.sub && (
                      <span className="font-normal text-muted-foreground ml-1">
                        ({activityLabel.sub})
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs block">
                    {CATEGORY_LABELS[row.category] || row.category}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {row.site_id 
                    ? <span className="text-foreground">{sites.find(s => s.id === row.site_id)?.name || '—'}</span>
                    : <span className="text-muted-foreground">Tous</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatPeriod(row.period_start, row.period_end)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.quantity.toLocaleString('fr-FR')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.unit}
                </TableCell>
                <TableCell>
                  <Badge variant={qualityConfig.variant} className="text-xs">
                    {qualityConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit?.(row.id)}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete?.(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {data.length > 10 && (
        <div className="border-t px-4 py-3 bg-muted/20 text-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/app/collecte/donnees')}
          >
            Voir les {data.length} données →
          </Button>
        </div>
      )}
    </div>
  );
};
