import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/contexts/AppDataContext";
import { supabase } from "@/integrations/api/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SimplifiedSidebar } from "@/components/layout/SimplifiedSidebar";
import { ModuleHeader } from "./ModuleHeader";

interface ModuleLayoutProps {
  children: React.ReactNode;
  moduleSlug: string;
}

export const ModuleLayout: React.FC<ModuleLayoutProps> = ({ children, moduleSlug }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { modules } = useAppData();
  const [userProfile, setUserProfile] = useState({
    fullName: 'Utilisateur',
    companyName: 'Mon Entreprise'
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: location } });
      return;
    }

    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur';
        const companyName = profile?.company_name || 'Mon Entreprise';

        setUserProfile({ fullName, companyName });
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };

    fetchUserProfile();
  }, [user, navigate, location]);

  if (!user) {
    return null;
  }

  const currentModule = modules.find(m => m.slug === moduleSlug);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SimplifiedSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <ModuleHeader 
            user={{
              name: userProfile.fullName,
              email: user.email || '',
              company: userProfile.companyName,
            }}
            currentModule={currentModule}
          />
          <main id="main-content" className="flex-1 min-w-0 overflow-auto p-4 sm:p-6 md:p-8 lg:p-10" role="main" aria-label="Contenu principal">
            <div className="max-w-7xl mx-auto w-full min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
