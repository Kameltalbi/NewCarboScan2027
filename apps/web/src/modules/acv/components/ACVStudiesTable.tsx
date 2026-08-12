import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Copy, FileText } from 'lucide-react';
import { ACVProject } from '@/types/acv';

interface ACVStudiesTableProps {
  studies: ACVProject[];
  onDuplicate?: (id: string) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Brouillon</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">En cours</Badge>;
    case 'completed':
      return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Calculée</Badge>;
    case 'locked':
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Verrouillée</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

const getScopeLabel = (scope: string | undefined) => {
  if (!scope) return '–';
  if (scope.toLowerCase().includes('grave')) return 'Cradle-to-grave';
  if (scope.toLowerCase().includes('gate')) return 'Cradle-to-gate';
  if (scope.toLowerCase().includes('simpli')) return 'Simplifié';
  return scope;
};

export const ACVStudiesTable: React.FC<ACVStudiesTableProps> = ({ 
  studies,
  onDuplicate 
}) => {
  const navigate = useNavigate();

  if (studies.length === 0) {
    return (
      <div className="py-12 text-center border rounded-lg bg-muted/10">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucune étude ACV n'a encore été créée.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4"
          onClick={() => navigate('/app/acv/nouveau-projet')}
        >
          Créer une étude ACV
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-medium">Nom de l'étude</TableHead>
            <TableHead className="font-medium">Objet</TableHead>
            <TableHead className="font-medium">Périmètre</TableHead>
            <TableHead className="font-medium">Indicateur principal</TableHead>
            <TableHead className="font-medium">Statut</TableHead>
            <TableHead className="font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studies.map((study) => (
            <TableRow key={study.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">{study.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {study.functional_unit || 'Produit'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {getScopeLabel(study.scope_definition)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                – kg CO₂e
              </TableCell>
              <TableCell>
                {getStatusBadge(study.status)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/app/acv/projet/${study.id}/resultats`)}
                    title="Consulter"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/app/acv/projet/${study.id}/modifier`)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDuplicate?.(study.id)}
                    title="Dupliquer"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
