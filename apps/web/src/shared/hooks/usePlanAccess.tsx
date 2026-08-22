import { useState, useEffect } from 'react';
import { api, sessionAuth } from "@/integrations/api/client";

export interface PlanFeatures {
  // Accès aux fonctionnalités
  canAccessScope3: boolean;
  canAccessAdvancedReports: boolean;
  canAccessExpertSupport: boolean;
  canAccessTraining: boolean;
  canAccessMultiSites: boolean;
  canAccessDashboardCustomization: boolean;
  canAccessApiAccess: boolean;
  canAccessUnlimitedUsers: boolean;
  canAccessCBAM: boolean;
  canAccessEconomicSimulation: boolean;
  
  // Limites
  maxAssessments: number;
  maxReportsPerYear: number;
  maxUsers: number;
  
  // Support
  supportLevel: 'email' | 'priority' | 'dedicated';
  responseTime: string;
  
  // Fonctionnalités spéciales
  hasCustomReporting: boolean;
  hasNetZeroPlanning: boolean;
  hasConsolidatedReporting: boolean;
}

export interface UserPlan {
  planType: 'essential' | 'carbo_pro' | 'carbo_expert' | null;
  planName: string;
  isActive: boolean;
  features: PlanFeatures;
  expiresAt?: string;
  order?: any;
}

const PLAN_FEATURES: Record<string, PlanFeatures> = {
  essential: {
    canAccessScope3: false,
    canAccessAdvancedReports: false,
    canAccessExpertSupport: false,
    canAccessTraining: false,
    canAccessMultiSites: false,
    canAccessDashboardCustomization: false,
    canAccessApiAccess: false,
    canAccessUnlimitedUsers: false,
    canAccessCBAM: false,
    canAccessEconomicSimulation: true,
    maxAssessments: 1,
    maxReportsPerYear: 2,
    maxUsers: 1,
    supportLevel: 'email',
    responseTime: '48h',
    hasCustomReporting: false,
    hasNetZeroPlanning: false,
    hasConsolidatedReporting: false,
  },
  carbo_pro: {
    canAccessScope3: true,
    canAccessAdvancedReports: true,
    canAccessExpertSupport: true,
    canAccessTraining: false,
    canAccessMultiSites: false,
    canAccessDashboardCustomization: true,
    canAccessApiAccess: false,
    canAccessUnlimitedUsers: false,
    canAccessCBAM: true,
    canAccessEconomicSimulation: true,
    maxAssessments: 3,
    maxReportsPerYear: 4,
    maxUsers: 5,
    supportLevel: 'priority',
    responseTime: '24h',
    hasCustomReporting: true,
    hasNetZeroPlanning: true,
    hasConsolidatedReporting: false,
  },
  carbo_expert: {
    canAccessScope3: true,
    canAccessAdvancedReports: true,
    canAccessExpertSupport: true,
    canAccessTraining: true,
    canAccessMultiSites: true,
    canAccessDashboardCustomization: true,
    canAccessApiAccess: true,
    canAccessUnlimitedUsers: true,
    canAccessCBAM: true,
    canAccessEconomicSimulation: true,
    maxAssessments: -1, // Illimité
    maxReportsPerYear: -1, // Illimité
    maxUsers: -1, // Illimité
    supportLevel: 'dedicated',
    responseTime: '2h',
    hasCustomReporting: true,
    hasNetZeroPlanning: true,
    hasConsolidatedReporting: true,
  },
};

const PLAN_NAMES = {
  essential: 'Plan Essentiel',
  carbo_pro: 'Plan Pro',
  carbo_expert: 'Plan Expert',
};

export const usePlanAccess = () => {
  const [userPlan, setUserPlan] = useState<UserPlan>({
    planType: null,
    planName: '',
    isActive: false,
    features: PLAN_FEATURES.essential, // Plan par défaut
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await sessionAuth.getUser();
      if (!user) {
        setUserPlan({
          planType: null,
          planName: '',
          isActive: false,
          features: PLAN_FEATURES.essential,
        });
        return;
      }

      const [ordersRes, orgRes] = await Promise.all([
        api.listOrders().catch(() => ({ items: [] as Array<Record<string, unknown>> })),
        api.getOrganization().catch(() => ({ organization: null })),
      ]);
      const orders = ordersRes.items || [];
      const currentOrder = orders.find((o) => String(o.status) === "validated") ?? orders[0];
      const planType = (
        (currentOrder?.plan_type as string | undefined) ||
        orgRes.organization?.subscriptionPlan ||
        "carbo_pro"
      ) as "essential" | "carbo_pro" | "carbo_expert";

      setUserPlan({
        planType,
        planName: PLAN_NAMES[planType] || planType,
        isActive: true,
        features: PLAN_FEATURES[planType] || PLAN_FEATURES.essential,
        order: currentOrder,
      });

    } catch (err) {
      console.error('Erreur lors de la récupération du plan:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUserPlan({
        planType: null,
        planName: 'Erreur',
        isActive: false,
        features: PLAN_FEATURES.essential,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPlan();
  }, []);

  // Fonctions utilitaires
  const hasFeature = (feature: keyof PlanFeatures): boolean => {
    return userPlan.features[feature] as boolean;
  };

  const getLimit = (limitType: 'maxAssessments' | 'maxReportsPerYear' | 'maxUsers'): number => {
    return userPlan.features[limitType];
  };

  const isUnlimited = (limitType: 'maxAssessments' | 'maxReportsPerYear' | 'maxUsers'): boolean => {
    return userPlan.features[limitType] === -1;
  };

  const canUpgrade = (): boolean => {
    return userPlan.planType !== 'carbo_expert';
  };

  const getUpgradeOptions = (): string[] => {
    if (!userPlan.planType || userPlan.planType === 'essential') {
      return ['carbo_pro', 'carbo_expert'];
    }
    if (userPlan.planType === 'carbo_pro') {
      return ['carbo_expert'];
    }
    return [];
  };

  const requiresUpgrade = (feature: keyof PlanFeatures): boolean => {
    return !hasFeature(feature);
  };

  return {
    userPlan,
    loading,
    error,
    hasFeature,
    getLimit,
    isUnlimited,
    canUpgrade,
    getUpgradeOptions,
    requiresUpgrade,
    refreshPlan: fetchUserPlan,
  };
};