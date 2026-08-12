-- Créer un profil par défaut pour l'utilisateur orphelin si il existe dans auth.users
DO $$
DECLARE 
    user_exists boolean;
BEGIN
    -- Vérifier si l'utilisateur existe dans auth.users (approximation via user_subscriptions ou autres tables)
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = 'ca4b72e3-9671-4485-a6d5-96e04ab503f0'
    ) INTO user_exists;
    
    -- Si l'utilisateur a une souscription, créer un profil par défaut
    IF user_exists THEN
        INSERT INTO profiles (user_id, company_name, sector, company_size, created_at, updated_at)
        VALUES (
            'ca4b72e3-9671-4485-a6d5-96e04ab503f0',
            'Organisation Inconnue', 
            'non-spécifié',
            '1-10',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Profil créé pour utilisateur orphelin';
    ELSE
        RAISE NOTICE 'Utilisateur introuvable dans le système';
    END IF;
END $$;