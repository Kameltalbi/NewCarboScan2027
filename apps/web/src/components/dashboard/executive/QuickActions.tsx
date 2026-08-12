// Quick Actions Section - Module-aware secondary buttons
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, Target, Package, GitCompare } from 'lucide-react';

interface QuickActionsProps {
  hasBilanCarbone: boolean;
  hasNetZero: boolean;
  hasEmpreinteProduit?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  hasBilanCarbone,
  hasNetZero,
  hasEmpreinteProduit = false,
}) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'add-data',
      label: 'Ajouter des données',
      icon: Plus,
      route: '/app/collecte',
      show: true,
    },
    {
      id: 'create-bilan',
      label: 'Créer un bilan carbone',
      icon: BarChart3,
      route: '/app/bilan-carbone/nouveau',
      show: hasBilanCarbone,
    },
    {
      id: 'create-pcf',
      label: 'Nouvelle étude produit',
      icon: Package,
      route: '/app/empreinte-produit/nouvelle-etude',
      show: hasEmpreinteProduit,
    },
    {
      id: 'compare-pcf',
      label: 'Comparer des produits',
      icon: GitCompare,
      route: '/app/empreinte-produit',
      show: hasEmpreinteProduit,
    },
    {
      id: 'create-trajectory',
      label: 'Feuille de route climat',
      icon: Target,
      route: '/app/net-zero',
      show: hasNetZero,
    },
  ].filter(action => action.show);

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">
        Actions rapides :
      </span>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => navigate(action.route)}
            className="text-xs gap-2 text-muted-foreground hover:text-foreground border-muted-foreground/30"
          >
            <Icon className="h-3 w-3" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
};
