import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Info } from 'lucide-react';

interface DashboardFooterProps {
  methodology: string;
  emissionFactorsVersion: string;
  calculationDate: string;
  onDownloadPDF: () => void;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({
  methodology,
  emissionFactorsVersion,
  calculationDate,
  onDownloadPDF
}) => {
  return (
    <footer className="mt-8 pt-6 border-t border-dashboard-separator">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            <span>Méthodologie : <strong className="text-foreground">{methodology}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Version FE : <strong className="text-foreground">{emissionFactorsVersion}</strong></span>
          </div>
          <div>
            Calculé le : <strong className="text-foreground">{calculationDate}</strong>
          </div>
        </div>
        
        <Button 
          onClick={onDownloadPDF}
          className="bg-carbon-impact hover:bg-carbon-dark text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger le rapport PDF
        </Button>
      </div>
    </footer>
  );
};
