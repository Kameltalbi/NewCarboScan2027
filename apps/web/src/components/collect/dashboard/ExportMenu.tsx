import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileSpreadsheet, 
  AlertTriangle, 
  Users,
  FileText,
  ChevronDown
} from 'lucide-react';

interface ExportMenuProps {
  onExportTemplate?: () => void;
  onExportData?: () => void;
  onExportAnomalies?: () => void;
  onExportSuppliers?: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExportTemplate,
  onExportData,
  onExportAnomalies,
  onExportSuppliers,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exporter
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Options d'export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />
          Télécharger le modèle Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportData}>
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          Exporter les données collectées
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportAnomalies}>
          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
          Exporter les anomalies
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportSuppliers}>
          <Users className="h-4 w-4 mr-2 text-rose-500" />
          Exporter statut fournisseurs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
