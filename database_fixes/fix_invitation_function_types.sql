-- Fix data type mismatch in invitation functions
-- This resolves the "Returned type character varying(255) does not match expected type text" error

-- Fix get_my_pending_invitations function with proper type casting
CREATE OR REPLACE FUNCTION public.get_my_pending_invitations()
RETURNS TABLE (
    invitation_id UUID,
    doctor_name TEXT,
    doctor_email TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get current user's email
    SELECT email::TEXT INTO user_email FROM auth.users WHERE id = auth.uid();
    
    RETURN QUERY
    SELECT 
        di.id,
        COALESCE(ud.name || ' ' || ud.surname, 'Dr. ' || split_part(au.email, '@', 1))::TEXT as doctor_name,
        au.email::TEXT as doctor_email,
        COALESCE(di.message, '')::TEXT as message,
        di.created_at
    FROM public.doctor_invitations di
    JOIN auth.users au ON di.doctor_id = au.id
    LEFT JOIN public.user_data ud ON di.doctor_id = ud.user_id
    WHERE di.patient_email = user_email
    AND di.status = 'pending'
    ORDER BY di.created_at DESC;
END;
$$;

-- Fix get_my_doctors function with proper type casting
CREATE OR REPLACE FUNCTION public.get_my_doctors()
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    doctor_email TEXT,
    connected_since TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dua.doctor_id,
        COALESCE(ud.name || ' ' || ud.surname, 'Dr. ' || split_part(au.email, '@', 1))::TEXT as doctor_name,
        au.email::TEXT as doctor_email,
        dua.granted_at as connected_since
    FROM public.doctor_user_access dua
    JOIN auth.users au ON dua.doctor_id = au.id
    LEFT JOIN public.user_data ud ON dua.doctor_id = ud.user_id
    WHERE dua.patient_id = auth.uid()
    ORDER BY dua.granted_at DESC;
END;
$$; 