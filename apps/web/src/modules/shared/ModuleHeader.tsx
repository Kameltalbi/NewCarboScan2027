import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useOrganizationYears } from "@/hooks/useOrganizationYears";
import { useAppData } from "@/contexts/AppDataContext";
import { Menu, User, Calendar, Download, GitCompare, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { OrganizationSwitcher } from "@/components/shared/OrganizationSwitcher";

const formatDateTime = () => {
  const now = new Date();
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const day = days[now.getDay()];
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day} ${date} ${time}`;
};
interface CurrentModule {
  name: string;
  description: string | null;
  slug: string;
  route: string;
}

interface ModuleHeaderProps {
  user: {
    name: string;
    email: string;
    company: string;
  };
  currentModule?: CurrentModule;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = React.memo(({ user, currentModule }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { organizationId } = useAppData();
  const [currentDateTime, setCurrentDateTime] = useState(formatDateTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(formatDateTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isBilanCarboneDashboard =
    currentModule?.slug === "bilan-carbone" &&
    location.pathname.includes("/app/bilan-carbone/dashboard");

  const isMainDashboard = location.pathname === "/app/dashboard" || location.pathname === "/app/dashboard/";
  const isCollecte = location.pathname.startsWith("/app/collecte") || location.pathname.startsWith("/app/collect");
  const showYearSelector = isMainDashboard || isCollecte;

  const currentYear = new Date().getFullYear();

  const { allowedYears: orgYears, defaultYear, isLoading: yearsLoading } = useOrganizationYears(organizationId);

  const [dashboardYear, setDashboardYear] = useState(defaultYear || currentYear);
  const initializedYearKeyRef = useRef<string | null>(null);
  const period = dashboardYear.toString();

  // Year selector state for dashboard
  const availableYears = useMemo(() => {
    // If org has configured years, use those; otherwise fallback to 2022-current
    if (orgYears.length > 0) {
      return Array.from(new Set([...orgYears, defaultYear].filter(Boolean) as number[])).sort((a, b) => a - b);
    }
    const years: number[] = [];
    for (let y = 2022; y <= currentYear; y++) years.push(y);
    if (defaultYear && !years.includes(defaultYear)) years.push(defaultYear);
    years.sort((a, b) => a - b);
    return years;
  }, [currentYear, defaultYear, orgYears]);

  const handleYearChange = useCallback((newYear: number) => {
    setDashboardYear(newYear);
    window.dispatchEvent(new CustomEvent('dashboardYearChange', { detail: newYear }));
    window.dispatchEvent(new CustomEvent('collectYearChange', { detail: newYear }));
  }, []);

  // Initialiser sur la dernière année de bilan, puis rester dans les années autorisées
  useEffect(() => {
    if (!showYearSelector || yearsLoading || availableYears.length === 0) return;
    const yearInitKey = `${organizationId ?? 'none'}:${defaultYear}`;

    if (initializedYearKeyRef.current === yearInitKey && availableYears.includes(dashboardYear)) {
      return;
    }

    initializedYearKeyRef.current = yearInitKey;

    if (availableYears.includes(defaultYear)) {
      handleYearChange(defaultYear);
      return;
    }

    if (!availableYears.includes(dashboardYear)) {
      handleYearChange(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, dashboardYear, defaultYear, handleYearChange, organizationId, showYearSelector, yearsLoading]);

  // Determine the title to display based on route
  const getHeaderTitle = () => {
    if (isMainDashboard) {
      return "Tableau de bord";
    }
    if (isCollecte) {
      return "Collecte de données";
    }
    if (location.pathname.startsWith('/app/net-zero')) {
      return "Plan d'actions";
    }
    if (location.pathname.startsWith('/app/scenarios')) {
      return "Modélisation Scénarios";
    }
    return currentModule?.name || "CarboScan";
  };

  const getHeaderDescription = () => {
    if (isMainDashboard) {
      return `Pilotage carbone • ${period}`;
    }
    if (isCollecte) {
      return `Année ${dashboardYear} • Alimentez vos modules avec des données fiables`;
    }
    return currentModule?.description || "";
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleCompare = () => {
    toast.info("Comparaison N-1 : bientôt disponible");
  };

  const handleExport = () => {
    toast.info("Export du rapport : bientôt disponible");
  };

  return (
    <header
      role="banner"
      aria-label="En-tête du module"
      className={
        isBilanCarboneDashboard
          ? "min-h-16 border-b border-dashboard-separator/20 bg-dashboard-header px-3 sm:px-4 py-3 flex items-center justify-between"
          : "h-16 border-b border-border bg-background px-3 sm:px-4 flex items-center justify-between"
      }
    >
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ouvrir/Fermer le menu latéral"
            className={isBilanCarboneDashboard ? "text-primary-foreground hover:bg-primary-foreground/10" : ""}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </SidebarTrigger>

        {isBilanCarboneDashboard ? (
          <div className="min-w-0">
            <h1 className="font-semibold text-primary-foreground truncate">{user.company}</h1>
            <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
              <Calendar className="h-4 w-4" />
              <span>Période analysée : {period}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{getHeaderTitle()}</h1>
            {showYearSelector && availableYears.length === 1 && (
              <span className="text-sm font-medium text-muted-foreground ml-1">
                — {availableYears[0]}
              </span>
            )}
            {showYearSelector && availableYears.length > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const idx = availableYears.indexOf(dashboardYear);
                    if (idx > 0) handleYearChange(availableYears[idx - 1]);
                  }}
                  disabled={availableYears.indexOf(dashboardYear) <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select
                  value={dashboardYear.toString()}
                  onValueChange={(v) => handleYearChange(parseInt(v))}
                >
                  <SelectTrigger className="w-[90px] h-7 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const idx = availableYears.indexOf(dashboardYear);
                    if (idx < availableYears.length - 1) handleYearChange(availableYears[idx + 1]);
                  }}
                  disabled={availableYears.indexOf(dashboardYear) >= availableYears.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <OrganizationSwitcher />
        <div className="hidden sm:flex items-center gap-2 text-sm text-primary">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{currentDateTime}</span>
        </div>

        {isBilanCarboneDashboard && (
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompare}
              className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Comparer année précédente
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              className="bg-carbon-impact hover:bg-carbon-dark text-primary-foreground"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter le rapport
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={
                isBilanCarboneDashboard
                  ? "flex items-center gap-2 text-primary-foreground hover:bg-primary-foreground/10"
                  : "flex items-center gap-2"
              }
            >
              <div
                className={
                  isBilanCarboneDashboard
                    ? "h-8 w-8 rounded-full bg-primary-foreground/10 flex items-center justify-center"
                    : "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
                }
              >
                <User
                  className={
                    isBilanCarboneDashboard
                      ? "h-4 w-4 text-primary-foreground"
                      : "h-4 w-4 text-primary"
                  }
                />
              </div>
              <div className="text-left hidden sm:block min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p
                  className={
                    isBilanCarboneDashboard
                      ? "text-xs text-primary-foreground/70 truncate"
                      : "text-xs text-muted-foreground truncate"
                  }
                >
                  {user.company}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/bilan-carbone/settings')}>
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/pricing')}>
              Abonnement
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

ModuleHeader.displayName = 'ModuleHeader';
