import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  BarChart3, Package, Leaf, Shield, Database, Zap, Target, GraduationCap,
  Home, Settings, LogOut, ChevronDown
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { ModuleConfig } from "@/modules";

const iconMap: Record<string, React.ElementType> = {
  BarChart3,
  Package,
  Leaf,
  Shield,
  Database,
  Zap,
  Target,
  GraduationCap,
};

interface ModuleSidebarProps {
  modules: ModuleConfig[];
  currentModuleSlug: string;
  loading?: boolean;
}

export const ModuleSidebar: React.FC<ModuleSidebarProps> = ({ 
  modules, 
  currentModuleSlug,
  loading = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="border-r border-slate-400 bg-slate-500">
      <SidebarHeader className="p-4 border-b border-slate-400">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <BrandLogo variant="dark" className="h-8" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-slate-400 px-4 py-2">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Chargement...</p>
                </div>
              ) : modules.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-400">Aucun module activé</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Contactez votre administrateur
                  </p>
                </div>
              ) : (
                modules.map((module) => {
                  const IconComponent = iconMap[module.icon] || BarChart3;
                  const isActive = currentModuleSlug === module.slug;
                  
                  return (
                    <SidebarMenuItem key={module.slug}>
                      <SidebarMenuButton
                        onClick={() => navigate(module.route)}
                        className={`w-full justify-start gap-3 px-4 py-2.5 rounded-[4px] transition-all ${
                          isActive 
                            ? 'bg-teal-600 text-white' 
                            : 'hover:bg-slate-400 text-white'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="font-medium">{module.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-400 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-white hover:text-white hover:bg-slate-400"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4" />
          Accueil
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-500 hover:text-red-400 hover:bg-slate-400"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
