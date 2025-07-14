-- Update get_my_doctors function to include professional info
-- This adds the info field to the return data for display in the healthcare team section

CREATE OR REPLACE FUNCTION public.get_my_doctors()
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    doctor_email TEXT,
    connected_since TIMESTAMP WITH TIME ZONE,
    info TEXT
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
        dua.granted_at as connected_since,
        COALESCE(ud.info, '')::TEXT as info
    FROM public.doctor_user_access dua
    JOIN auth.users au ON dua.doctor_id = au.id
    LEFT JOIN public.user_data ud ON dua.doctor_id = ud.user_id
    WHERE dua.patient_id = auth.uid()
    ORDER BY dua.granted_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_my_doctors() TO authenticated; 