// Module Status Overview - Clean table showing module states
// Essential for operational clarity

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  BarChart3, 
  Package, 
  Recycle, 
  Target,
  ArrowRight,
  Play,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

export interface ModuleInfo {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  lastUpdate?: Date;
  route: string;
  isActive: boolean;
}

interface ModuleStatusTableProps {
  modules: ModuleInfo[];
}

const STATUS_CONFIG = {
  not_started: { 
    label: 'Non démarré', 
    className: 'bg-muted text-muted-foreground',
    action: 'Commencer',
    actionIcon: Play,
  },
  in_progress: { 
    label: 'En cours', 
    className: 'bg-amber-100 text-amber-800',
    action: 'Continuer',
    actionIcon: ArrowRight,
  },
  completed: { 
    label: 'Terminé', 
    className: 'bg-emerald-100 text-emerald-800',
    action: 'Consulter',
    actionIcon: Eye,
  },
};

export const ModuleStatusTable: React.FC<ModuleStatusTableProps> = ({ modules }) => {
  const navigate = useNavigate();
  
  // Filter only active modules
  const activeModules = modules.filter(m => m.isActive);
  
  if (activeModules.length === 0) {
    return null;
  }

  return (
    <Card className="border rounded">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          État des modules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Module
                </th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Statut
                </th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Dernière mise à jour
                </th>
                <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {activeModules.map((module) => {
                const statusConfig = STATUS_CONFIG[module.status];
                const ActionIcon = statusConfig.actionIcon;
                
                return (
                  <tr key={module.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground shrink-0">
                          {module.icon}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {module.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded',
                        statusConfig.className
                      )}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {module.lastUpdate 
                          ? format(module.lastUpdate, 'dd MMM yyyy', { locale: fr })
                          : '—'
                        }
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(module.route)}
                        className="text-xs gap-1 text-primary hover:text-primary hover:bg-primary/5"
                      >
                        {statusConfig.action}
                        <ActionIcon className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper to create default modules configuration
export const getDefaultModules = (hasModule: (slug: string) => boolean): Omit<ModuleInfo, 'status' | 'lastUpdate'>[] => [
  {
    id: 'collect',
    name: 'Collecte de données',
    slug: 'collecte',
    icon: <Database className="h-4 w-4" />,
    route: '/app/collecte',
    isActive: hasModule('collecte') || hasModule('collect'),
  },
  {
    id: 'bilan-carbone',
    name: 'Bilan Carbone',
    slug: 'bilan-carbone',
    icon: <BarChart3 className="h-4 w-4" />,
    route: '/app/bilan-carbone',
    isActive: hasModule('bilan-carbone'),
  },
  {
    id: 'empreinte-produit',
    name: 'Empreinte Produit',
    slug: 'empreinte-produit',
    icon: <Package className="h-4 w-4" />,
    route: '/app/empreinte-produit',
    isActive: hasModule('empreinte-produit'),
  },
  {
    id: 'acv',
    name: 'Analyse Cycle de Vie',
    slug: 'acv',
    icon: <Recycle className="h-4 w-4" />,
    route: '/app/acv',
    isActive: hasModule('acv'),
  },
  {
    id: 'net-zero',
    name: 'Feuille de route climat',
    slug: 'net-zero',
    icon: <Target className="h-4 w-4" />,
    route: '/app/net-zero',
    isActive: hasModule('net-zero') || hasModule('trajectoire'),
  },
];
