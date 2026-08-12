// Mode guidé Empreinte Produit
// Réutilise la logique de ProductWizard mais intégré dans le module Collecte

import React from 'react';
import { ProductWizard } from '@/modules/empreinte-produit/components/ProductWizard';

interface GuidedModeProduitProps {
  organizationId: string;
}

export const GuidedModeProduit: React.FC<GuidedModeProduitProps> = ({ organizationId }) => {
  // Le composant ProductWizard gère déjà toute la logique
  // Il utilise useOrganizationId() en interne, donc organizationId est optionnel ici
  // mais on le garde pour cohérence avec l'interface
  return <ProductWizard />;
};

