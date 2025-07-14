-- Fix mutable search_path security issue for invitation trigger function
-- This addresses the PostgreSQL security warning about function having a role mutable search_path

CREATE OR REPLACE FUNCTION public.update_invitation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$; 