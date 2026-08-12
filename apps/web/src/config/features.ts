// Feature flags pour activer/désactiver des fonctionnalités

export const FEATURES = {
  // Utiliser la sidebar simplifiée au lieu de la sidebar complexe
  USE_SIMPLIFIED_SIDEBAR: true,
  
  // Autres feature flags à venir
  ENABLE_AI_SUGGESTIONS: false,
  ENABLE_ADVANCED_CHARTS: true,
  ENABLE_EXPORT_EXCEL: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURES[feature];
};
