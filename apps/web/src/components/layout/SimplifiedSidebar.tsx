// Sidebar simplifiée orientée parcours utilisateur
// Groupée par responsabilité : Pilotage > Données > Analyse > Action > Système

import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppData } from '@/contexts/AppDataContext';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Package,
  Target,
  Settings,
  LogOut,
  LucideIcon,
  // Building2 removed — using Leaf for logo
  Lock,
  Users,
  Leaf,
  GitBranch,
  Construction,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from "@/integrations/api/client";
import { useSupplierLabels } from '@/hooks/useSupplierLabels';

interface ModuleItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  requiresModule?: string;
  comingSoon?: boolean;
  external?: boolean;
}

interface SidebarGroup {
  label: string;
  items: ModuleItem[];
}

// Dashboard toujours visible, hors groupes
const dashboardItem: ModuleItem = {
  id: 'dashboard',
  label: 'Dashboard',
  path: '/app/dashboard',
  icon: LayoutDashboard,
};

const sidebarGroups: SidebarGroup[] = [
  {
    label: 'Carbon Accounting',
    items: [
      {
        id: 'data-collection',
        label: 'Collecte',
        path: '/app/collecte',
        icon: Database,
      },
      {
        id: 'bilan-carbone',
        label: 'Bilan Carbone',
        path: '/app/bilan-carbone',
        icon: BarChart3,
        requiresModule: 'bilan-carbone',
      },
      {
        id: 'fournisseurs',
        label: 'Fournisseurs',
        path: '/app/fournisseurs',
        icon: Users,
        requiresModule: 'fournisseurs',
      },
    ],
  },
  {
    label: 'Analysis',
    items: [
      {
        id: 'empreinte-produit',
        label: 'Empreinte Produit',
        path: '/app/empreinte-produit',
        icon: Package,
        requiresModule: 'empreinte-produit',
      },
      {
        id: 'acv',
        label: 'ACV',
        path: '/app/acv',
        icon: Leaf,
        requiresModule: 'acv',
      },
    ],
  },
  {
    label: 'Énergie & Bâtiments',
    items: [
      {
        id: 'wattbim',
        label: 'WattBim',
        path: '/app/wattbim',
        icon: Zap,
        comingSoon: true,
      },
    ],
  },
  {
    label: 'Climate Strategy',
    items: [
      {
        id: 'plan-net-zero',
        label: "Plan d'actions",
        path: '/app/net-zero',
        icon: Target,
        requiresModule: 'decarbotech',
      },
      {
        id: 'modelisation-scenario',
        label: 'Modélisation Scénarios',
        path: '/app/scenarios',
        icon: GitBranch,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        id: 'settings',
        label: 'Paramètres',
        path: '/app/parametres',
        icon: Settings,
      },
    ],
  },
];

interface SimplifiedSidebarProps {
  className?: string;
}

export const SimplifiedSidebar: React.FC<SimplifiedSidebarProps> = React.memo(({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { modules, modulesLoading, organizationId, organizationLoading } = useAppData();
  const { signOut, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const supplierLabels = useSupplierLabels();

  // Adapte le libellé du module "Fournisseurs" selon le secteur (banque -> Portefeuille)
  const displayGroups = React.useMemo(() => sidebarGroups.map(group => ({
    ...group,
    items: group.items.map(item =>
      item.id === 'fournisseurs' ? { ...item, label: supplierLabels.moduleTitle } : item
    ),
  })), [supplierLabels.moduleTitle]);

  // Load organization logo
  useEffect(() => {
    const loadOrgLogo = async () => {
      if (!user?.id) return;
      try {
        const { organization } = await api.getOrganization();
        setOrgLogoUrl(organization?.logoUrl ?? null);
      } catch (error) {
        logger.error('Error loading org logo:', error);
      }
    };
    loadOrgLogo();
    const handleLogoUpdate = () => loadOrgLogo();
    window.addEventListener('orgLogoUpdated', handleLogoUpdate);
    return () => window.removeEventListener('orgLogoUpdated', handleLogoUpdate);
  }, [user?.id]);

  useEffect(() => {
    if (!organizationLoading) {
      setLoading(false);
    }
  }, [organizationLoading]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string): boolean => {
    if (path === '/app/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const activeModuleSlugs = modules.map(m => m.slug);

  const isModuleLocked = (item: ModuleItem): boolean => {
    if (item.external) return false;
    if (item.comingSoon) return true;
    return !!item.requiresModule && !activeModuleSlugs.includes(item.requiresModule);
  };

  if (loading || modulesLoading || organizationLoading) {
    return (
      <Sidebar className={cn("border-r border-[hsl(var(--sidebar-border))]", className)}>
        <SidebarContent className="px-4 py-4 bg-[hsl(var(--sidebar))]">
          <div className="text-[hsl(var(--sidebar-muted))] text-sm">Chargement...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const renderItem = (item: ModuleItem) => {
    const ItemIcon = item.icon;
    const active = isActive(item.path);
    const locked = isModuleLocked(item);

    return (
      <SidebarMenuItem key={item.id}>
        <button
          onClick={() => {
            if (locked) return;
            if (item.external) { window.open(item.path, '_blank', 'noopener'); return; }
            navigate(item.path);
          }}
          disabled={locked}
          aria-current={active ? 'page' : undefined}
          aria-label={locked ? `${item.label} — ${item.comingSoon ? 'Bientôt disponible' : 'Module verrouillé'}` : item.label}
          role="menuitem"
          className={cn(
            "flex items-center w-full px-3 py-2 text-sm font-medium rounded transition-all duration-150 relative group",
            locked ? [
              "opacity-50 cursor-not-allowed",
              "text-[hsl(var(--sidebar-muted))]"
            ] : [
              "hover:bg-[hsl(var(--sidebar-accent))]",
              active && [
                "bg-[hsl(var(--sidebar-active-bg))]",
                "text-[hsl(var(--sidebar-primary))]",
                "font-semibold",
              ],
              !active && "text-[hsl(var(--sidebar-foreground))]"
            ]
          )}
        >
          {active && !locked && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[hsl(var(--sidebar-primary))] rounded-r-full" aria-hidden="true" />
          )}
          <ItemIcon
            className={cn(
              "mr-3 h-[18px] w-[18px] transition-colors",
              locked
                ? "text-[hsl(var(--sidebar-muted))]"
                : active
                  ? "text-[hsl(var(--sidebar-primary))]"
                  : "text-[hsl(var(--sidebar-muted))] group-hover:text-[hsl(var(--sidebar-foreground))]"
            )}
            aria-hidden="true"
          />
          <span className="flex-1 text-left">{item.label}</span>
          {item.comingSoon && (
            <span className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-muted))]" aria-label="Bientôt disponible">
              <Construction className="h-2.5 w-2.5" aria-hidden="true" />
              Bientôt
            </span>
          )}
          {locked && !item.comingSoon && (
            <Lock className="h-3.5 w-3.5 text-[hsl(var(--sidebar-muted))]" aria-hidden="true" />
          )}
        </button>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className={cn("border-r-0", className)} aria-label="Navigation principale">
      {/* Header avec logo organisation */}
      <SidebarHeader className="px-5 pt-6 pb-4 bg-[hsl(var(--sidebar))]">
        <div className="flex items-center gap-3">
          {orgLogoUrl ? (
            <img
              src={orgLogoUrl}
              alt="Logo organisation"
              className="h-9 w-auto max-w-[140px] object-contain brightness-0 invert"
            />
          ) : (
            <div className="flex items-center gap-2">
              <Leaf className="w-7 h-7 text-[hsl(160,60%,50%)]" />
              <span className="text-lg font-bold text-white tracking-tight">CarboScan</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-2 bg-[hsl(var(--sidebar))] overflow-y-auto" role="navigation" aria-label="Menu des modules">
        <SidebarMenu>
          {/* Dashboard — toujours visible en haut */}
          <div className="mb-1">
            {renderItem(dashboardItem)}
          </div>

          {/* Groupes séparés par de fines lignes horizontales */}
          {displayGroups.map((group, idx) => (
            <div key={group.label}>
              <div className="mx-3 my-2 h-px bg-[hsl(var(--sidebar-border))]" />
              <div className="space-y-0.5">
                {group.items.map(renderItem)}
              </div>
            </div>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer avec user info + déconnexion */}
      <SidebarFooter className="p-0 bg-[hsl(var(--sidebar))]" />
    </Sidebar>
  );
});

SimplifiedSidebar.displayName = 'SimplifiedSidebar';
