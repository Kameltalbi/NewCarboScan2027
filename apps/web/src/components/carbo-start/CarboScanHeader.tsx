import React from "react";
import { logger } from '@/utils/logger';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  User, 
  Settings, 
  LogOut, 
  Bell,
  Plus,
  Mail,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useAuth } from "@/hooks/useAuth";

interface CarboScanHeaderProps {
  user?: {
    name: string;
    email: string;
    company?: string;
  };
  usage?: {
    assessments_used: number;
    assessments_limit: number;
  };
  hasActiveSubscription?: boolean;
}

export const CarboScanHeader: React.FC<CarboScanHeaderProps> = ({ user, usage, hasActiveSubscription }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { userPlan, getLimit } = usePlanAccess();
  
  // Utiliser la vraie limite du plan au lieu de celle de la base de données
  const actualLimit = getLimit('maxAssessments');
  
  logger.debug("CarboScanHeader - limite du plan:", actualLimit);

  // Si pas d'utilisateur connecté, utiliser des données par défaut
  const currentUser = user || {
    name: "Utilisateur",
    email: "user@example.com", 
    company: "Mon Entreprise",
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true, state: { loggedOut: true } });
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Toggle sidebar button */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-6 w-6" />
          
          
          {/* Logo entreprise - temporaire */}
          <div className="h-10 px-3 py-1 flex items-center justify-center bg-primary/10 rounded border">
            <span className="text-sm font-medium text-primary">
              {user?.name || "Organisation"}
            </span>
          </div>
          
          {/* Badge plan */}
          <div className="flex items-center">
            <Badge variant="secondary" className="text-xs">
              {userPlan.planName || "Plan Essentiel"}
            </Badge>
          </div>
        </div>

        {/* Section centrale - Informations du dashboard */}
        <div className="flex-1 flex items-center justify-center gap-6">
          {usage && hasActiveSubscription && (
            <>
              {/* Bouton Nouveau Bilan */}
              {usage.assessments_used >= actualLimit ? (
                <div className="text-center">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-orange-500 text-orange-500 hover:bg-orange-50"
                    onClick={() => navigate('/contact')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t("dashboard.header.contactUs")}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dashboard.header.quotaReached")}
                  </p>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="text-white shadow-lg" 
                  style={{ backgroundColor: '#2d6e4a' }}
                  onClick={() => navigate('/carbo-start/questionnaire')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("dashboard.header.newAssessment")}
                </Button>
              )}
              
              {/* Statut des évaluations */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div>
                  {t("dashboard.header.assessments")}: <span className="text-foreground">{usage.assessments_used}/{actualLimit}</span>
                </div>
                <div className="w-16">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(usage.assessments_used / actualLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {usage.assessments_used >= actualLimit && (
                  <div className="flex items-center gap-1 text-xs text-orange-500">
                    <AlertTriangle className="h-3 w-3" />
                    {t("dashboard.header.limitReached")}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Section utilisateur */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-100">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={currentUser.name} />
                  <AvatarFallback className="bg-primary text-white text-sm">
                    {getUserInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                  <div className="text-xs text-gray-600">{currentUser.company}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{currentUser.name}</div>
                <div className="text-xs text-gray-600">{currentUser.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                {t("dashboard.header.myProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                {t("dashboard.header.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                {t("dashboard.header.disconnect")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};