import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { Loader2 } from 'lucide-react';

interface ModuleProtectedRouteProps {
  children: React.ReactNode;
}

export const ModuleProtectedRoute: React.FC<ModuleProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  
  const { user, isLoading: authLoading } = useAuth();
  const { 
    userRole, 
    roleLoading, 
    isSuperAdmin,
    modules, 
    modulesLoading,
    subscriptionLoading
  } = useAppData();

  // EXCEPTION 1: Le Dashboard est toujours accessible si l'utilisateur est connecté
  const isDashboardRoute = location.pathname.startsWith('/app/dashboard');
  if (isDashboardRoute) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    
    return <>{children}</>;
  }

  // Attendre que l'authentification et le rôle soient chargés
  if (authLoading || roleLoading || subscriptionLoading || (user && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si pas connecté, rediriger vers auth
  if (!user) {
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.toString() 
      ? `/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`
      : '/auth';
    return <Navigate to={redirectTo} replace />;
  }

  // EXCEPTION 2: la collecte est le point d'entrée depuis un dashboard vide.
  // Elle doit rester accessible à tout utilisateur authentifié, même lorsque
  // son abonnement n'a pas encore été synchronisé dans AppDataContext.
  const isCollectRoute = location.pathname.startsWith('/app/collect') || location.pathname.startsWith('/app/collecte');
  
  if (isCollectRoute) {
    return <>{children}</>;
  }

  // Les superadmins ont accès à tout
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Pour les autres utilisateurs, attendre le chargement des modules
  if (modulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si pas de modules achetés, rediriger vers pricing
  if (modules.length === 0) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};
