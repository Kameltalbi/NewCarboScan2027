// Mode guidé Bilan Carbone
// Réutilise la logique de DatabaseCarboScanQuestionnaire mais intégré dans le module Collecte

import React from 'react';
import { DatabaseCarboScanQuestionnaire } from '@/components/carbo-start/DatabaseCarboScanQuestionnaire';

interface GuidedModeBCProps {
  organizationId: string;
}

export const GuidedModeBC: React.FC<GuidedModeBCProps> = ({ organizationId }) => {
  // Le composant DatabaseCarboScanQuestionnaire gère déjà toute la logique
  // Il utilise useOrganizationId() en interne, donc organizationId est optionnel ici
  // mais on le garde pour cohérence avec l'interface
  return <DatabaseCarboScanQuestionnaire />;
};

