-- Supprimer les anciens modules et recréer avec la nouvelle structure
DELETE FROM public.modules;

-- Insérer les modules officiels de CarboScan Suite
INSERT INTO public.modules (slug, name, description, icon, route, category, is_active) VALUES
-- MODULES CORE
('bilan-carbone', 'Bilan Carbone', 'Calculez l''empreinte carbone complète de votre entreprise (Scopes 1, 2 et 3). Module principal avec questionnaire, dashboard, rapports PDF et trajectoire Net Zéro.', 'BarChart3', '/app/bilan-carbone', 'core', true),
('empreinte-produit', 'Empreinte Produit', 'Calculez l''empreinte carbone de vos produits avec une ACV simplifiée (A1-A5, D). Export PDF et rapports détaillés.', 'Package', '/app/empreinte-produit', 'core', true),
('acv', 'Analyse Cycle de Vie', 'ACV complète multi-indicateurs : GWP, ODP, AP, EP, POCP. Module premium pour analyses environnementales avancées.', 'Leaf', '/app/acv', 'core', true),
('cbam', 'CBAM Calculator', 'Calculateur CBAM pour la conformité réglementaire UE. Calcul des émissions intrinsèques et coût carbone des exportations.', 'Shield', '/app/cbam', 'core', true),
('collect', 'CarboScan Collect', 'Collecte intelligente de données : import Excel, OCR PDF, validation IA. Alimentez tous vos modules automatiquement.', 'Database', '/app/collect', 'core', true),
('energy', 'CarboScan Energy', 'Suivi énergétique en temps réel : import factures, dashboard, alertes surconsommation. Optimisez vos coûts énergétiques.', 'Zap', '/app/energy', 'core', true),
('decarbotech', 'Decarbotech', 'Plan de réduction Net-Zero, intégration IoT, tableaux de bord de décarbonation. Passez à l''action concrète.', 'Target', '/app/decarbotech', 'core', true),

-- MODULES TECHNIQUES
('admin', 'Administration', 'Gestion des utilisateurs, organisations et abonnements. Module interne pour administrateurs.', 'Settings', '/superadmin', 'technical', true),

-- MODULES MARKETING (landing pages)
('landing-bilan', 'Page Bilan Carbone', 'Page de présentation du module Bilan Carbone', 'FileText', '/bilan-carbone', 'landing', true),
('landing-produit', 'Page Empreinte Produit', 'Page de présentation du module Empreinte Produit', 'FileText', '/empreinte-produit', 'landing', true),
('landing-acv', 'Page ACV', 'Page de présentation du module ACV', 'FileText', '/acv-landing', 'landing', true),
('landing-cbam', 'Page CBAM', 'Page de présentation du module CBAM', 'FileText', '/cbam', 'landing', true),
('landing-collect', 'Page Collect', 'Page de présentation du module Collect', 'FileText', '/collect', 'landing', true),
('landing-energy', 'Page Energy', 'Page de présentation du module Energy', 'FileText', '/energy', 'landing', true),
('landing-decarbotech', 'Page Decarbotech', 'Page de présentation du module Decarbotech', 'FileText', '/decarbotech', 'landing', true);