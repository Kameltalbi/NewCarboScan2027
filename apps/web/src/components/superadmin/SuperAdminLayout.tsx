import React from "react";
import { logger } from '@/utils/logger';
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Building, 
  Users, 
  CreditCard, 
   
  LogOut,
  Shield,
  FileText,
  Database,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useUserRoleCached } from "@/contexts/AppDataContext";

const navigationGroups = [
  {
    label: 'Gestion',
    items: [
      { title: 'Organisations', url: '/superadmin/organizations', icon: Building },
      { title: 'Utilisateurs', url: '/superadmin/users', icon: Users },
      { title: 'Codes promotionnels', url: '/superadmin/promo-codes', icon: CreditCard },
    ],
  },
  {
    label: 'Ressources',
    items: [
      { title: 'Facteurs d’émission', url: '/superadmin/emission-factors', icon: Database },
      { title: 'Contenus du blog', url: '/superadmin/blog', icon: FileText },
    ],
  },
];

export const SuperAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const { userRole } = useUserRoleCached();
  const isFinanceur = userRole === 'financeur';

  const handleLogout = async () => {
    logger.debug('Déconnexion SuperAdmin...');
    try {
      api.logout();
    } catch (error) {
      logger.warn('logout warning:', error);
    } finally {
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      window.location.href = '/auth';
    }
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path.split('?')[0] + '/');

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border/70 bg-card transition-all duration-200 shrink-0 h-screen sticky top-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header sidebar */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">CarboScan</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isFinanceur ? 'Accès financeur · lecture seule' : 'Administration plateforme'}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {/* Dashboard link */}
          <button
            onClick={() => navigate('/superadmin/dashboard')}
            className={cn(
              "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive('/superadmin/dashboard')
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Centre de pilotage"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Centre de pilotage</span>}
          </button>

          {(isFinanceur
            ? [{
                label: 'Consultation',
                items: [
                  { title: 'Organisations', url: '/superadmin/organizations', icon: Building },
                  { title: 'Utilisateurs', url: '/superadmin/users', icon: Users },
                  { title: 'Facteurs d’émission', url: '/superadmin/emission-factors', icon: Database },
                ],
              }]
            : navigationGroups
          ).map(group => (
            <div key={group.label} className="pt-4">
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = isActive(item.url);
                  return (
                    <button
                      key={item.title}
                      onClick={() => navigate(item.url)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      title={item.title}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          {isFinanceur && (
            <button
              onClick={() => navigate('/app/dashboard')}
              className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              title="Tester CarboScan"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Tester CarboScan</span>}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
