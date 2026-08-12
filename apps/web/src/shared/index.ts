// Point d'entrée pour les dépendances partagées entre modules
export { usePlanAccess } from './hooks/usePlanAccess';
export type { UserPlan, PlanFeatures } from './hooks/usePlanAccess';

export { generateAutomaticProfessionalRecommendations } from './services/professionalRecommendations';
export { getRecommendedActions } from './services/recommendedActions';
export type { RecommendedAction } from './services/recommendedActions';

