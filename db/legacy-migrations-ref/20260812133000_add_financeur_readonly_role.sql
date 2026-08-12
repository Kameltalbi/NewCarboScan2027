-- Accès financeur : lecture seule du centre de pilotage Superadmin.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeur';
