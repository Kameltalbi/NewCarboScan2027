import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  Package, 
  BarChart3, 
  FileText, 
  GitCompare, 
  Download,
  ArrowLeft
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

interface ACVLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: "Tableau de bord",
    url: "/analyse-cycle-vie",
    icon: Home,
  },
  {
    title: "Nouveau projet",
    url: "/acv/nouveau-projet",
    icon: Plus,
  },
  {
    title: "Inventaire",
    url: "/acv/inventaire",
    icon: Package,
  },
  {
    title: "Résultats",
    url: "/acv/resultats",
    icon: BarChart3,
  },
  {
    title: "Interprétation",
    url: "/acv/interpretation",
    icon: FileText,
  },
  {
    title: "Comparaison",
    url: "/acv/comparaison",
    icon: GitCompare,
  },
  {
    title: "Export",
    url: "/acv/export",
    icon: Download,
  },
];

function ModernACVSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/analyse-cycle-vie") {
      return location.pathname === "/analyse-cycle-vie";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="sidebar-modern border-r-0 shadow-[var(--shadow-soft)]">
      <SidebarContent className="bg-sidebar">
        {/* Logo section */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/carbo-start/dashboard')}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors duration-200 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au dashboard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
              <span className="text-xl">🌱</span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-sidebar-foreground">Analyse ACV</h2>
              <p className="text-xs text-sidebar-foreground/60">Cycle de Vie</p>
            </div>
          </div>
        </div>

        <SidebarGroup className="px-4 py-4">
          <SidebarGroupLabel className="sidebar-group-label mb-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => navigate(item.url)}
                        className={`sidebar-item w-full ${active ? 'sidebar-item-active' : ''}`}
                      >
                        <item.icon className="sidebar-icon" />
                        <span className="sidebar-text">{item.title}</span>
                        {active && (
                          <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function ACVLayout({ children }: ACVLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <ModernACVSidebar />
        <main className="flex-1">
          <div className="p-8">
            <SidebarTrigger className="mb-6 bg-sidebar hover:bg-sidebar-accent border border-sidebar-border" />
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}