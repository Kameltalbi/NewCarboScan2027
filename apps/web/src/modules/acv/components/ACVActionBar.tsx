import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, GitCompare, BarChart3, History } from 'lucide-react';

export const ACVActionBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-b border-t bg-muted/20 px-1">
      {/* Primary action */}
      <Button 
        onClick={() => navigate('/app/acv/nouveau-projet')}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Créer une étude ACV
      </Button>

      {/* Secondary actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/acv/scenarios')}
          className="gap-2"
        >
          <GitCompare className="h-4 w-4" />
          Comparer des ACV
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/acv/impacts')}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Consulter les résultats
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/acv/rapports')}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Accéder à l'historique
        </Button>
      </div>
    </div>
  );
};
