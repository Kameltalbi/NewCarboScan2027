import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Target, Sliders, TrendingDown, History } from 'lucide-react';

export const NetZeroActionBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-b border-t bg-muted/20 px-1">
      {/* Primary action */}
      <Button 
        onClick={() => navigate('/app/net-zero/nouveau')}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Créer une feuille de route
      </Button>

      {/* Secondary actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/net-zero/objectifs')}
          className="gap-2"
        >
          <Target className="h-4 w-4" />
          Définir les objectifs
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/net-zero/leviers')}
          className="gap-2"
        >
          <Sliders className="h-4 w-4" />
          Gérer les actions
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/net-zero/trajectoire')}
          className="gap-2"
        >
          <TrendingDown className="h-4 w-4" />
          Suivre la trajectoire
        </Button>
      </div>
    </div>
  );
};
