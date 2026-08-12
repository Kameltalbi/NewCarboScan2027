-- Créer la table actions_recommandees
CREATE TABLE public.actions_recommandees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  scope_cible TEXT NOT NULL CHECK (scope_cible IN ('1', '2', '3', 'tous')),
  seuil_emission_kgCO2e INTEGER NOT NULL DEFAULT 0,
  categorie TEXT NOT NULL,
  impact_estime_pourcent TEXT NOT NULL,
  priorite TEXT NOT NULL CHECK (priorite IN ('haute', 'moyenne', 'basse')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.actions_recommandees ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view recommended actions" 
ON public.actions_recommandees 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Index pour optimiser les requêtes par scope et seuil
CREATE INDEX idx_actions_scope_seuil ON public.actions_recommandees(scope_cible, seuil_emission_kgCO2e);
CREATE INDEX idx_actions_priorite ON public.actions_recommandees(priorite);

-- Insérer quelques actions d'exemple
INSERT INTO public.actions_recommandees (titre, description, scope_cible, seuil_emission_kgCO2e, categorie, impact_estime_pourcent, priorite) VALUES
('Optimiser l''éclairage LED', 'Remplacer tous les éclairages par des LED haute efficacité et installer des détecteurs de présence', '2', 5000, 'Énergie', '15-25%', 'haute'),
('Mettre en place un plan de mobilité durable', 'Encourager le télétravail, covoiturage et transports en commun pour les déplacements professionnels', '3', 10000, 'Mobilité', '20-30%', 'haute'),
('Améliorer l''isolation thermique', 'Renforcer l''isolation des bâtiments pour réduire les besoins en chauffage et climatisation', '1', 8000, 'Énergie', '10-20%', 'moyenne'),
('Digitaliser les processus', 'Réduire l''impression papier et dématérialiser les documents administratifs', '3', 2000, 'Achats', '5-10%', 'moyenne'),
('Optimiser la gestion des déchets', 'Mettre en place un tri sélectif efficace et réduire les déchets à la source', 'tous', 1000, 'Déchets', '5-15%', 'basse'),
('Choisir un fournisseur d''énergie verte', 'Souscrire à un contrat d''électricité 100% renouvelable', '2', 3000, 'Énergie', '30-50%', 'haute'),
('Former les équipes aux écogestes', 'Sensibiliser et former les collaborateurs aux bonnes pratiques environnementales', 'tous', 500, 'Formation', '5-10%', 'basse'),
('Optimiser les équipements informatiques', 'Configurer la mise en veille automatique et choisir des équipements basse consommation', '2', 2000, 'Énergie', '10-15%', 'moyenne');