import React, { useState, useEffect } from "react";
import { logger } from '@/utils/logger';
import { ModernCarboScanSidebar } from "./ModernCarboScanSidebar";
import { CarboScanHeader } from "./CarboScanHeader";
import { SubscriptionStatusGuard } from "./SubscriptionStatusGuard";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/api/client";
import { useAssessmentUsage } from '@/hooks/useAssessmentUsage';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface CarboScanLayoutProps {
  children: React.ReactNode;
}

export const CarboScanLayout: React.FC<CarboScanLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{
    fullName: string;
    companyName: string;
  }>({
    fullName: 'Utilisateur',
    companyName: 'Mon Entreprise'
  });
  const { usage } = useAssessmentUsage();
  const { hasActiveSubscription } = useSubscriptionStatus();
  
  logger.debug("CarboScanLayout - user:", user?.id);

  // Récupérer les informations utilisateur depuis la table profiles
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        // D'abord essayer de récupérer depuis profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erreur lors du chargement du profil:', profileError);
        }

        // Récupérer le nom complet depuis les métadonnées utilisateur
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur';
        const companyName = profile?.company_name || 'Mon Entreprise';

        logger.debug("Profile récupéré:", { fullName, companyName });

        setUserProfile({
          fullName,
          companyName
        });
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    fetchUserProfile();
  }, [user?.id, user?.user_metadata, user?.email]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ModernCarboScanSidebar />
        <div className="flex-1 flex flex-col">
          <CarboScanHeader 
            user={user ? {
              name: userProfile.fullName,
              email: user.email || '',
              company: userProfile.companyName,
            } : undefined}
            usage={usage}
            hasActiveSubscription={hasActiveSubscription}
          />
          <SubscriptionStatusGuard>
            {children}
          </SubscriptionStatusGuard>
        </div>
      </div>
    </SidebarProvider>
  );
};