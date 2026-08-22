import { useState, useEffect } from 'react';
import { api, getStoredUser } from "@/integrations/api/client";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  orders: any[];
  loading: boolean;
  error: string | null;
}

export const useSubscriptionStatus = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    orders: [],
    loading: true,
    error: null
  });

  const checkSubscriptionStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      const user = getStoredUser();
      if (!user) {
        setStatus({
          hasActiveSubscription: false,
          orders: [],
          loading: false,
          error: 'Utilisateur non connecté'
        });
        return;
      }

      const data = await api.getSubscription();
      setStatus({
        hasActiveSubscription: data.hasActiveSubscription,
        orders: data.orders || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du statut d\'abonnement:', error);
      setStatus({
        hasActiveSubscription: false,
        orders: [],
        loading: false,
        error: 'Erreur lors de la vérification du statut'
      });
    }
  };

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  return {
    ...status,
    refreshStatus: checkSubscriptionStatus
  };
};
