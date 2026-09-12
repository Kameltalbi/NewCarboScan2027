import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Award, BarChart3, FileText, Settings, Plus, LogOut, Shield, Database, TrendingUp, Euro, History, PlusCircle, Crown, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand/BrandLogo";

import { useTranslation } from "react-i18next";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useAuth } from "@/hooks/useAuth";
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
    title: "Nouveau bilan",
    url: "/carbo-start/questionnaire",
    icon: PlusCircle,
  },
  {
    title: "Historique",
    url: "/carbo-start/bilans",
    icon: History,
  },
];

const getAnalysisMenuItems = () => [
  {
    title: "Analyse de Cycle de Vie (ACV)",
    url: "/analyse-cycle-vie",
    icon: Leaf,
  },
  {
    title: "Simulation économique",
    url: "/simulateur-economique",
    icon: TrendingUp,
  },
  {
    title: "Module CBAM exportateurs",
    url: "/carbo-start/cbam-module",
    icon: Shield,
  },
];

const getSettingsMenuItems = (t: any) => [
  {
    title: "Paramètres",
    url: "/carbo-start/parametres",
    icon: Settings,
  },
];

export const CarboScanSidebar: React.FC = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { t } = useTranslation();
  const { hasFeature } = usePlanAccess();
  const { signOut } = useAuth();

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-white/20 text-white font-medium" : "hover:bg-white/10 text-white/90";

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true, state: { loggedOut: true } });
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <Sidebar className="border-white/20" style={{ backgroundColor: 'hsl(var(--primary))' }} collapsible="icon">
      <SidebarContent style={{ backgroundColor: 'hsl(var(--primary))' }}>
        {/* Logo section */}
        <div className={`p-4 border-b border-white/20 ${isCollapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            {!isCollapsed ? (
              <BrandLogo variant="dark" className="h-12" />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center">
                <BrandLogo variant="symbol" className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {getMainMenuItems(t).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls({ isActive: isActive(item.url) })}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <>
                          <span>{item.title}</span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2">
          <SidebarGroupLabel className={`text-white/70 ${isCollapsed ? 'sr-only' : ''}`}>
            Mes bilans
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getBilansMenuItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls({ isActive: isActive(item.url) })}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2">
          <SidebarGroupLabel className={`text-white/70 ${isCollapsed ? 'sr-only' : ''}`}>
            Outils d'analyse
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getAnalysisMenuItems().map((item) => {
                const isCbam = item.title.includes("CBAM");
                const isSimulation = item.title.includes("Simulation");
                const isACV = item.title.includes("ACV");
                const needsUpgrade = (isCbam && !hasFeature('canAccessCBAM')) || 
                                   (isSimulation && !hasFeature('canAccessEconomicSimulation'));
                
                // ACV is always accessible, no upgrade needed
                if (isACV) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          className={getNavCls({ isActive: isActive(item.url) })}
                          title={isCollapsed ? item.title : undefined}
                        >
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                
                if (needsUpgrade) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        onClick={() => navigate('/pricing')}
                        className="text-white/60 hover:bg-white/10 cursor-pointer"
                        title={isCollapsed ? `${item.title} - Disponible dans CarboPlus` : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between w-full">
                            <span>{item.title}</span>
                            <Badge variant="secondary" className="text-xs bg-white/20 text-white/80 border-white/30">
                              Plus
                            </Badge>
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavCls({ isActive: isActive(item.url) })}
                        title={isCollapsed ? item.title : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {getSettingsMenuItems(t).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls({ isActive: isActive(item.url) })}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>



        {/* Logout */}
        <div className={`p-4 border-t border-white/20 ${isCollapsed ? 'px-2' : ''}`}>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className={`${isCollapsed ? 'w-8 h-8 p-0' : 'w-full justify-start'} text-white/90 hover:text-red-300 hover:bg-red-500/20 transition-colors duration-200`}
            title={isCollapsed ? t("dashboard.sidebar.logout") : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-3 font-medium">Déconnexion</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
