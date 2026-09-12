import React, { useState, useEffect } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Award, 
  BarChart3, 
  FileText, 
  Settings, 
  Plus, 
  LogOut, 
  Shield, 
  Database, 
  TrendingUp, 
  Euro, 
  History, 
  PlusCircle, 
  Crown, 
  Leaf,
  ChevronRight,
  Download,
  DollarSign,
  Sparkles,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppDataContext";
import { useTranslation } from "react-i18next";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/integrations/api/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const getMainMenuItems = (t: any) => [
  {
    title: "Tableau de bord",
    url: "/carbo-start/dashboard",
    icon: BarChart3,
  },
];

const getBilansMenuItems = () => [
  {
    title: "Créer un bilan",
    url: "/carbo-start/questionnaire",
    icon: PlusCircle,
  },
  {
    title: "Historique des bilans",
    url: "/carbo-start/bilans",
    icon: History,
  },
];

const getAnalysisMenuItems = () => [
  {
    title: "Analyse produit (ACV)",
    url: "/acv",
    icon: Leaf,
  },
  {
    title: "Analyse coûts & réductions",
    url: "/simulateur-economique",
    icon: DollarSign,
  },
  {
    title: "CBAM Export",
    url: "/carbo-start/cbam-module",
    icon: Shield,
  },
  {
    title: "DecarboTech®",
    url: "/solutions",
    icon: Sparkles,
  },
];

const getReportsMenuItems = () => [
  {
    title: "Rapports & Export",
    url: "/carbo-start/rapports",
    icon: Download,
  },
];

const getSettingsMenuItems = (t: any) => [
  {
    title: "Paramètres",
    url: "/carbo-start/parametres",
    icon: Settings,
  },
];

export const ModernCarboScanSidebar: React.FC = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { isSuperAdmin } = useAppData();
  const { t } = useTranslation();
  const { hasFeature } = usePlanAccess();
  const { signOut } = useAuth();
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;

  // Charger le logo organisation
  useEffect(() => {
    const loadOrgLogo = async () => {
      try {
        const { organization } = await api.getOrganization();
        setOrgLogoUrl(organization?.logoUrl ?? null);
      } catch (error) {
        console.error('Error loading org logo:', error);
      }
    };

    loadOrgLogo();
    
    // Écouter les mises à jour du logo
    const handleLogoUpdate = () => loadOrgLogo();
    window.addEventListener('orgLogoUpdated', handleLogoUpdate);
    return () => window.removeEventListener('orgLogoUpdated', handleLogoUpdate);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true, state: { loggedOut: true } });
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const renderMenuItem = (item: any, isUpgrade = false) => {
    const MenuIcon = item.icon;
    const active = isActive(item.url);
    const hasBadge = item.badge;

    if (isUpgrade) {
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <div className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 transition-all duration-200 cursor-not-allowed opacity-70">
              <MenuIcon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{item.title}</span>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200">
                      Premium
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink 
            to={item.url} 
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              active 
                ? 'bg-primary/10 text-primary font-semibold shadow-sm' 
                : 'text-gray-700 hover:text-primary hover:bg-gray-100/70'
            }`}
          >
            <MenuIcon className={`h-4 w-4 flex-shrink-0 transition-colors ${
              active ? 'text-primary' : 'text-gray-500 group-hover:text-primary'
            }`} />
            {!isCollapsed && (
              <>
                <span className="text-sm font-medium truncate flex-1">{item.title}</span>
                {hasBadge && (
                  <Badge 
                    variant="secondary" 
                    className="ml-auto text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-sm flex-shrink-0"
                  >
                    {item.badge}
                  </Badge>
                )}
                {active && !hasBadge && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
              </>
            )}
            {active && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="sidebar-modern border-r border-gray-200/50 bg-gradient-to-b from-white to-gray-50/50 shadow-sm" collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo section - Organisation ou CarboScan */}
        <div className={`px-6 py-5 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm ${isCollapsed ? 'px-3 py-4' : ''}`}>
          <div className="flex items-center gap-3">
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                {orgLogoUrl ? (
                  <img 
                    src={orgLogoUrl} 
                    alt="Logo organisation" 
                    className="h-10 max-w-[140px] w-auto object-contain transition-opacity"
                  />
                ) : (
                  <BrandLogo variant="light" className="h-9" />
                )}
              </div>
            ) : (
              <div className="w-9 h-9 flex items-center justify-center mx-auto rounded-[4px] bg-primary/5 overflow-hidden">
                {orgLogoUrl ? (
                  <img 
                    src={orgLogoUrl} 
                    alt="Logo organisation" 
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <BrandLogo variant="symbol" className="h-7 w-7" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          {/* Main Menu - Section principale */}
          <SidebarGroup className="px-3 mb-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                Navigation
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {getMainMenuItems(t).map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Bilans Section - Réorganisée */}
          <SidebarGroup className="px-3 mb-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                Bilans Carbone
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {getBilansMenuItems().map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Reports & Export - Premium Feature */}
          {hasFeature('canAccessAdvancedReports') && (
            <SidebarGroup className="px-3 mb-6">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Documents
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {getReportsMenuItems().map((item) => renderMenuItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Advanced Analysis - Réorganisée */}
          <SidebarGroup className="px-3 mb-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                Analyses
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {getAnalysisMenuItems().map((item) => {
                  if (item.title === "Analyse coûts & réductions" && !hasFeature('canAccessAdvancedReports')) {
                    return renderMenuItem(item, true);
                  }
                  return renderMenuItem(item);
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Settings - Section Configuration */}
          <SidebarGroup className="px-3 mb-4">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                Configuration
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {getSettingsMenuItems(t).map((item) => renderMenuItem(item))}
                
                {/* Super Admin Access */}
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/superadmin" className="sidebar-item">
                        <Shield className="sidebar-icon" />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="sidebar-text">Admin</span>
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                              Super
                            </Badge>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Logout - Fixé en bas avec meilleur design */}
        <div className="px-3 py-4 border-t border-gray-200/60 bg-white/30 backdrop-blur-sm mt-auto">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50/50 transition-all duration-200 rounded-[4px] ${
              isCollapsed ? 'px-2 justify-center' : 'px-3'
            }`}
          >
            <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="font-medium">Déconnexion</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};