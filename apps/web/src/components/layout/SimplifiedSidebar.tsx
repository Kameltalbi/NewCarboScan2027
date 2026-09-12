// Sidebar simplifiée orientée parcours utilisateur
// Groupée par responsabilité : Pilotage > Données > Analyse > Action > Système

import React, { useState, useEffect, useMemo } from 'react';
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
import { BrandLogo } from '@/components/brand/BrandLogo';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Package,
  Target,
  Settings,
  LucideIcon,
  Lock,
  Users,
  GitBranch,
  Construction,
  Zap,
  Leaf,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { api } from "@/integrations/api/client";
import { useSupplierLabels } from '@/hooks/useSupplierLabels';
import { useTranslation } from 'react-i18next';

interface ModuleItem {
  id: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
  requiresModule?: string;
  comingSoon?: boolean;
  external?: boolean;
}

interface SidebarGroupDef {
  labelKey: string;
  items: ModuleItem[];
}

const dashboardItem: ModuleItem = {
  id: 'dashboard',
  labelKey: 'sidebarNav.items.dashboard',
  path: '/app/dashboard',
  icon: LayoutDashboard,
};

const sidebarGroups: SidebarGroupDef[] = [
  {
    labelKey: 'sidebarNav.groups.carbonAccounting',
    items: [
      {
        id: 'data-collection',
        labelKey: 'sidebarNav.items.collect',
        path: '/app/collecte',
        icon: Database,
      },
      {
        id: 'emission-factors',
        labelKey: 'sidebarNav.items.emissionFactors',
        path: '/app/emission-factors',
        icon: Leaf,
      },
      {
        id: 'bilan-carbone',
        labelKey: 'sidebarNav.items.bilanCarbone',
        path: '/app/bilan-carbone',
        icon: BarChart3,
        requiresModule: 'bilan-carbone',
      },
      {
        id: 'fournisseurs',
        labelKey: 'sidebarNav.items.suppliers',
        path: '/app/fournisseurs',
        icon: Users,
        requiresModule: 'fournisseurs',
      },
    ],
  },
  {
    labelKey: 'sidebarNav.groups.analysis',
    items: [
      {
        id: 'empreinte-produit',
        labelKey: 'sidebarNav.items.empreinteProduit',
        path: '/app/empreinte-produit',
        icon: Package,
        requiresModule: 'empreinte-produit',
      },
      {
        id: 'acv',
        labelKey: 'sidebarNav.items.acv',
        path: '/app/acv',
        icon: Leaf,
        requiresModule: 'acv',
      },
    ],
  },
  {
    labelKey: 'sidebarNav.groups.energyBuildings',
    items: [
      {
        id: 'wattbim',
        labelKey: 'sidebarNav.items.wattbim',
        path: '/app/wattbim',
        icon: Zap,
        comingSoon: true,
      },
    ],
  },
  {
    labelKey: 'sidebarNav.groups.climateStrategy',
    items: [
      {
        id: 'plan-net-zero',
        labelKey: 'sidebarNav.items.actionPlan',
        path: '/app/net-zero',
        icon: Target,
        requiresModule: 'decarbotech',
      },
      {
        id: 'modelisation-scenario',
        labelKey: 'sidebarNav.items.scenarios',
        path: '/app/scenarios',
        icon: GitBranch,
      },
    ],
  },
  {
    labelKey: 'sidebarNav.groups.system',
    items: [
      {
        id: 'settings',
        labelKey: 'sidebarNav.items.settings',
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
  const { t } = useTranslation();
  const { modules, modulesLoading, organizationLoading } = useAppData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const supplierLabels = useSupplierLabels();

  const resolveLabel = (item: ModuleItem): string => {
    if (item.id === 'fournisseurs') return supplierLabels.moduleTitle;
    return t(item.labelKey);
  };

  const displayGroups = useMemo(
    () =>
      sidebarGroups.map((group) => ({
        id: group.labelKey,
        label: t(group.labelKey),
        items: group.items.map((item) => ({
          ...item,
          label: resolveLabel(item),
        })),
      })),
    // resolveLabel depends on t + supplierLabels
    [supplierLabels.moduleTitle, t],
  );

  const dashboardDisplay = useMemo(
    () => ({ ...dashboardItem, label: t(dashboardItem.labelKey) }),
    [t],
  );

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

  const isActive = (path: string): boolean => {
    if (path === '/app/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const activeModuleSlugs = modules.map((m) => m.slug);

  const isModuleLocked = (item: ModuleItem): boolean => {
    if (item.external) return false;
    if (item.comingSoon) return true;
    return !!item.requiresModule && !activeModuleSlugs.includes(item.requiresModule);
  };

  if (loading || modulesLoading || organizationLoading) {
    return (
      <Sidebar className={cn("border-r border-[hsl(var(--sidebar-border))]", className)}>
        <SidebarContent className="px-4 py-4 bg-[hsl(var(--sidebar))]">
          <div className="text-[hsl(var(--sidebar-muted))] text-sm">{t('navigation.loading')}</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const renderItem = (item: ModuleItem & { label: string }) => {
    const ItemIcon = item.icon;
    const active = isActive(item.path);
    const locked = isModuleLocked(item);
    const lockedHint = item.comingSoon
      ? t('navigation.comingSoonFull')
      : t('navigation.moduleLocked');

    return (
      <SidebarMenuItem key={item.id}>
        <button
          onClick={() => {
            if (locked) return;
            if (item.external) {
              window.open(item.path, '_blank', 'noopener');
              return;
            }
            navigate(item.path);
          }}
          disabled={locked}
          aria-current={active ? 'page' : undefined}
          aria-label={locked ? `${item.label} — ${lockedHint}` : item.label}
          role="menuitem"
          className={cn(
            "flex items-center w-full px-3 py-2 text-sm font-medium rounded transition-all duration-150 relative group",
            locked
              ? ["opacity-50 cursor-not-allowed", "text-[hsl(var(--sidebar-muted))]"]
              : [
                  "hover:bg-[hsl(var(--sidebar-accent))]",
                  active && [
                    "bg-[hsl(var(--sidebar-active-bg))]",
                    "text-[hsl(var(--sidebar-primary))]",
                    "font-semibold",
                  ],
                  !active && "text-[hsl(var(--sidebar-foreground))]",
                ],
          )}
        >
          {active && !locked && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[hsl(var(--sidebar-primary))] rounded-r-full"
              aria-hidden="true"
            />
          )}
          <ItemIcon
            className={cn(
              "mr-3 h-[18px] w-[18px] transition-colors",
              locked
                ? "text-[hsl(var(--sidebar-muted))]"
                : active
                  ? "text-[hsl(var(--sidebar-primary))]"
                  : "text-[hsl(var(--sidebar-muted))] group-hover:text-[hsl(var(--sidebar-foreground))]",
            )}
            aria-hidden="true"
          />
          <span className="flex-1 text-left">{item.label}</span>
          {item.comingSoon && (
            <span
              className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-muted))]"
              aria-label={t('navigation.comingSoonFull')}
            >
              <Construction className="h-2.5 w-2.5" aria-hidden="true" />
              {t('navigation.comingSoonShort')}
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
    <Sidebar className={cn("border-r-0", className)} aria-label={t('navigation.mainNavAria')}>
      <SidebarHeader className="px-5 pt-6 pb-4 bg-[hsl(var(--sidebar))]">
        <div className="flex items-center gap-3">
          {orgLogoUrl ? (
            <img
              src={orgLogoUrl}
              alt={t('navigation.orgLogoAlt')}
              className="h-9 w-auto max-w-[140px] object-contain brightness-0 invert"
            />
          ) : (
            <BrandLogo variant="dark" className="h-9" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent
        className="px-3 py-2 bg-[hsl(var(--sidebar))] overflow-y-auto"
        role="navigation"
        aria-label={t('navigation.modulesMenuAria')}
      >
        <SidebarMenu>
          <div className="mb-1">{renderItem(dashboardDisplay)}</div>

          {displayGroups.map((group) => (
            <div key={group.id}>
              <div className="mx-3 my-2 h-px bg-[hsl(var(--sidebar-border))]" />
              <div className="space-y-0.5">{group.items.map(renderItem)}</div>
            </div>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-0 bg-[hsl(var(--sidebar))]" />
    </Sidebar>
  );
});

SimplifiedSidebar.displayName = 'SimplifiedSidebar';
