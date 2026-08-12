import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileSpreadsheet, 
  Edit, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export const CollectMainActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'new',
      label: 'Ajouter une nouvelle donnée',
      description: 'Saisir manuellement une donnée d\'activité',
      icon: Plus,
      primary: true,
      path: '/app/collecte/activity-data',
    },
    {
      id: 'import',
      label: 'Importer des données',
      description: 'Import Excel, CSV ou factures',
      icon: FileSpreadsheet,
      primary: false,
      path: '/app/collecte/importer',
    },
    {
      id: 'edit',
      label: 'Modifier les données existantes',
      description: 'Consulter et éditer les données saisies',
      icon: Edit,
      primary: false,
      path: '/app/collecte/donnees',
    },
    {
      id: 'control',
      label: 'Contrôler la cohérence',
      description: 'Vérifier la qualité des données',
      icon: ShieldCheck,
      primary: false,
      path: '/app/collecte/consolidation',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Actions principales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.primary ? 'default' : 'outline'}
                className={`h-auto p-4 justify-start ${action.primary ? 'sm:col-span-2' : ''}`}
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${action.primary ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${action.primary ? '' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">{action.label}</p>
                    <p className={`text-xs ${action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-50" />
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
