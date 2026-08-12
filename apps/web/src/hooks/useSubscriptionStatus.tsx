import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";

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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus({
          hasActiveSubscription: false,
          orders: [],
          loading: false,
          error: 'Utilisateur non connecté'
        });
        return;
      }

      // Récupérer les commandes de l'utilisateur
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        setStatus({
          hasActiveSubscription: false,
          orders: [],
          loading: false,
          error: error.message
        });
        return;
      }

      // Vérifier s'il y a une commande validée
      const hasValidatedOrder = orders?.some(order => order.status === 'validated');

      setStatus({
        hasActiveSubscription: hasValidatedOrder || false,
        orders: orders || [],
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