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

interface NetZeroPlan {
  id: string;
  name: string;
  referenceYear: number;
  targetYear: number;
  reductionTarget: number;
  status: 'draft' | 'active' | 'tracking' | 'revised';
}

interface NetZeroPlansTableProps {
  plans: NetZeroPlan[];
  onDuplicate?: (id: string) => void;
}

const getStatusBadge = (status: NetZeroPlan['status']) => {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Brouillon</Badge>;
    case 'active':
      return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Actif</Badge>;
    case 'tracking':
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">En suivi</Badge>;
    case 'revised':
      return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Révisé</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

export const NetZeroPlansTable: React.FC<NetZeroPlansTableProps> = ({ 
  plans,
  onDuplicate 
}) => {
  const navigate = useNavigate();

  if (plans.length === 0) {
    return (
      <div className="py-12 text-center border rounded-lg bg-muted/10">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucune feuille de route climat n'a encore été créée.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4"
          onClick={() => navigate('/app/net-zero/nouveau')}
        >
          Créer une feuille de route
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-medium">Nom du plan</TableHead>
            <TableHead className="font-medium">Année de référence</TableHead>
            <TableHead className="font-medium">Horizon cible</TableHead>
            <TableHead className="font-medium">Objectif de réduction</TableHead>
            <TableHead className="font-medium">Statut</TableHead>
            <TableHead className="font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">{plan.name}</TableCell>
              <TableCell className="text-muted-foreground">{plan.referenceYear}</TableCell>
              <TableCell className="text-muted-foreground">{plan.targetYear}</TableCell>
              <TableCell className="text-muted-foreground">-{plan.reductionTarget}%</TableCell>
              <TableCell>{getStatusBadge(plan.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/app/net-zero/plan/${plan.id}`)}
                    title="Consulter"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/app/net-zero/plan/${plan.id}/modifier`)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDuplicate?.(plan.id)}
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
