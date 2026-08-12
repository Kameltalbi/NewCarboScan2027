import React from "react";
import { Navigate } from "react-router-dom";
import { useUserRoleCached } from "@/contexts/AppDataContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { userRole, isLoading, isSuperAdmin } = useUserRoleCached();

  console.log('🛡️ ProtectedRoute: Loading:', isLoading, 'Role:', userRole, 'IsSuperAdmin:', isSuperAdmin());

  // Attendre que le chargement soit vraiment terminé
  if (isLoading || userRole === null) {
    console.log('🛡️ ProtectedRoute: Still loading or role is null...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin() && userRole !== 'financeur') {
    console.log('🛡️ ProtectedRoute: Not authorized, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('🛡️ ProtectedRoute: Access granted');
  return <>{children}</>;
};
