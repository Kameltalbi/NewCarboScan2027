-- Migration: Remove Energy Module
-- Description: Remove the Energy module from the modules table and organization_modules
-- Note: This does NOT remove energy-related data used for Scope 1/2 calculations in Collect/Carbon modules

-- Remove Energy module from modules table
DELETE FROM public.modules WHERE slug = 'energy';

-- Remove Energy module from organization_modules (cascade will handle related data)
DELETE FROM public.organization_modules 
WHERE module_id IN (SELECT id FROM public.modules WHERE slug = 'energy');

-- Note: We keep activity_energy table and emission_factors_co2 table as they are used
-- for Scope 1 and Scope 2 calculations in the Carbon and Collect modules.
-- The Energy module was just a UI wrapper, the actual energy data is managed through Collect.

