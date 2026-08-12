import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Upload, ShieldCheck, Lock } from 'lucide-react';

interface CollectActionBarProps {
  canValidate: boolean;
  onValidate: () => void;
  isLocked?: boolean;
}

export const CollectActionBar: React.FC<CollectActionBarProps> = ({
  canValidate,
  onValidate,
  isLocked = false,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-b border-t bg-muted/20 px-1">
      {/* Primary action */}
      <Button 
        onClick={() => navigate('/app/collecte/nouvelle')}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une donnée
      </Button>

      {/* Secondary actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/collecte/importer')}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Importer
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/collecte/controle')}
          className="gap-2"
        >
          <ShieldCheck className="h-4 w-4" />
          Contrôler la cohérence
        </Button>

        <Button 
          variant={isLocked ? 'secondary' : 'outline'}
          size="sm"
          onClick={onValidate}
          disabled={!canValidate || isLocked}
          className="gap-2"
        >
          <Lock className="h-4 w-4" />
          {isLocked ? 'Verrouillées' : 'Valider les données'}
        </Button>
      </div>
    </div>
  );
};
