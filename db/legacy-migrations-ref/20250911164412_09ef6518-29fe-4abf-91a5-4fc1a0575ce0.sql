-- Mettre à jour le profil pour l'utilisateur service.qhse@smip.com.tn avec des informations d'entreprise appropriées
UPDATE profiles 
SET 
    company_name = 'SMIP',
    sector = 'Industrie',
    updated_at = now()
WHERE user_id = 'ca4b72e3-9671-4485-a6d5-96e04ab503f0';

-- Créer une entrée dans la table companies pour cette organisation
INSERT INTO companies (
    user_id,
    nom_entreprise,
    secteur,
    collaborateurs,
    devise,
    created_at,
    updated_at
)
VALUES (
    'ca4b72e3-9671-4485-a6d5-96e04ab503f0',
    'SMIP',
    'Industrie',
    50,
    'TND',
    now(),
    now()
)
ON CONFLICT (user_id) DO UPDATE SET
    nom_entreprise = EXCLUDED.nom_entreprise,
    secteur = EXCLUDED.secteur,
    updated_at = now();