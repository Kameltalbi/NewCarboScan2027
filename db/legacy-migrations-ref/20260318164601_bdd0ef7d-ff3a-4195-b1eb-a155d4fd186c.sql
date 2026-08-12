
-- ============================================================
-- FACTEURS D'ÉMISSION MONÉTAIRES ADEME (Base Empreinte / ADEME 2024)
-- Ratios kgCO2e/€ par catégorie d'achat — données de référence
-- Source: Base Empreinte ADEME, ratios monétaires sectoriels France
-- ============================================================

INSERT INTO public.supplier_monetary_factors (purchase_category, purchase_subcategory, naf_code, emission_factor, unit, source, source_version, source_year, country, uncertainty_percent, is_default, organization_id)
VALUES
-- MATIÈRES PREMIÈRES & INDUSTRIE
('Matières premières', 'Acier et métaux ferreux', 'C24', 1.450, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Matières premières', 'Aluminium', 'C24.4', 2.100, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Matières premières', 'Cuivre et alliages', 'C24.4', 1.200, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Matières premières', 'Plastiques et polymères', 'C20.1', 1.800, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Matières premières', 'Verre', 'C23.1', 0.850, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Matières premières', 'Bois et produits forestiers', 'C16', 0.320, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 35, true, NULL),
('Matières premières', 'Papier et carton', 'C17', 0.680, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Matières premières', 'Ciment et béton', 'C23.5', 1.950, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 35, true, NULL),
('Matières premières', 'Produits chimiques', 'C20', 1.350, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),
('Matières premières', 'Textile et fibres', 'C13', 1.100, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),

-- ÉNERGIE
('Énergie', 'Électricité (France)', 'D35.1', 0.055, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 20, true, NULL),
('Énergie', 'Gaz naturel', 'D35.2', 0.420, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 25, true, NULL),
('Énergie', 'Fioul et combustibles', 'D35', 0.580, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 25, true, NULL),
('Énergie', 'Carburants routiers', 'G47.3', 0.490, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 20, true, NULL),

-- TRANSPORT & LOGISTIQUE
('Transport', 'Transport routier marchandises', 'H49.4', 0.750, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Transport', 'Transport ferroviaire marchandises', 'H49.2', 0.120, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 35, true, NULL),
('Transport', 'Transport maritime', 'H50', 0.350, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Transport', 'Transport aérien fret', 'H51.2', 1.850, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 35, true, NULL),
('Transport', 'Entreposage et stockage', 'H52.1', 0.280, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),
('Transport', 'Courrier et messagerie', 'H53', 0.450, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),

-- SERVICES PROFESSIONNELS
('Services', 'Conseil et études', 'M70', 0.085, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 55, true, NULL),
('Services', 'Services informatiques', 'J62', 0.120, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 55, true, NULL),
('Services', 'Services juridiques et comptables', 'M69', 0.075, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 55, true, NULL),
('Services', 'Services de nettoyage', 'N81', 0.180, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),
('Services', 'Gardiennage et sécurité', 'N80', 0.095, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 55, true, NULL),
('Services', 'Publicité et marketing', 'M73', 0.110, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 55, true, NULL),
('Services', 'Formation professionnelle', 'P85.5', 0.065, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 55, true, NULL),
('Services', 'Télécommunications', 'J61', 0.140, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),

-- ÉQUIPEMENTS & IMMOBILISATIONS
('Équipements', 'Équipements informatiques', 'C26', 0.650, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Équipements', 'Machines industrielles', 'C28', 0.480, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Équipements', 'Véhicules', 'C29', 0.550, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Équipements', 'Mobilier de bureau', 'C31', 0.380, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),

-- ALIMENTATION & AGRICULTURE
('Alimentation', 'Produits alimentaires transformés', 'C10', 0.950, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Alimentation', 'Boissons', 'C11', 0.420, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Alimentation', 'Restauration collective', 'I56', 0.780, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),
('Alimentation', 'Agriculture et élevage', 'A01', 1.650, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),

-- BTP & IMMOBILIER
('Construction', 'Travaux de construction', 'F41', 0.850, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Construction', 'Génie civil', 'F42', 1.100, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Construction', 'Travaux de finition', 'F43', 0.450, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),
('Construction', 'Location immobilière', 'L68', 0.120, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 50, true, NULL),

-- DÉCHETS & TRAITEMENT
('Déchets', 'Collecte et traitement des déchets', 'E38', 0.350, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 45, true, NULL),
('Déchets', 'Recyclage', 'E38.3', 0.180, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),
('Déchets', 'Traitement des eaux', 'E36', 0.220, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'FR', 40, true, NULL),

-- FACTEURS PAR PAYS (Afrique — contexte CarboScan)
('Énergie', 'Électricité (Maroc)', NULL, 0.620, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'MA', 30, true, NULL),
('Énergie', 'Électricité (Sénégal)', NULL, 0.580, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'SN', 35, true, NULL),
('Énergie', 'Électricité (Côte d''Ivoire)', NULL, 0.450, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'CI', 35, true, NULL),
('Énergie', 'Électricité (Tunisie)', NULL, 0.520, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'TN', 30, true, NULL),
('Énergie', 'Électricité (Nigeria)', NULL, 0.680, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'NG', 35, true, NULL),
('Énergie', 'Électricité (Allemagne)', NULL, 0.320, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'DE', 20, true, NULL),
('Énergie', 'Électricité (Chine)', NULL, 0.750, 'kgCO2e/EUR', 'ADEME Base Empreinte', '2024', 2024, 'CN', 30, true, NULL);
