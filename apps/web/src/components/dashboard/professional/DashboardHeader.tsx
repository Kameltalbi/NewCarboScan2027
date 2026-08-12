import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, GitCompare, Calendar } from 'lucide-react';

interface DashboardHeaderProps {
  companyName: string;
  period: string;
  onExport: () => void;
  onCompare: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  companyName,
  period,
  onExport,
  onCompare
}) => {
  return (
    <header 
      className="px-6 py-5 rounded-xl shadow-lg mb-6"
      style={{ backgroundColor: '#0F172A' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 
              className="text-xl md:text-2xl font-bold tracking-tight"
              style={{ color: '#FFFFFF' }}
            >
              {companyName}
            </h1>
            <div 
              className="flex items-center gap-2 text-sm mt-1"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <Calendar className="h-4 w-4" />
              <span>Période analysée : {period}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCompare}
            className="border-white/30 hover:bg-white/10"
            style={{ backgroundColor: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Comparer année précédente
          </Button>
          <Button 
            size="sm"
            onClick={onExport}
            style={{ backgroundColor: '#1ABC9C', color: '#FFFFFF' }}
            className="hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter le rapport
          </Button>
        </div>
      </div>
    </header>
  );
};
