-- Fix invitation acceptance issues
-- 1. Add unique constraint for ON CONFLICT to work
-- 2. Fix RLS policies for user_goals table

-- Add unique constraint to doctor_user_access table if it doesn't exist
-- First, check if constraint already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'doctor_user_access_unique'
    ) THEN
        ALTER TABLE public.doctor_user_access 
        ADD CONSTRAINT doctor_user_access_unique 
        UNIQUE (doctor_id, patient_id);
    END IF;
END $$;

-- Ensure RLS policies allow users to insert their own goals
-- Drop and recreate user_goals policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can view their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.user_goals;

-- Create optimized RLS policies for user_goals
CREATE POLICY "Users can view their own goals" ON public.user_goals
    FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own goals" ON public.user_goals
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own goals" ON public.user_goals
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own goals" ON public.user_goals
    FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Also allow doctors to insert/update goals for their patients
CREATE POLICY "Doctors can manage patient goals" ON public.user_goals
    FOR ALL USING (
        user_id IN (
            SELECT dua.patient_id 
            FROM public.doctor_user_access dua 
            WHERE dua.doctor_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT dua.patient_id 
            FROM public.doctor_user_access dua 
            WHERE dua.doctor_id = (SELECT auth.uid())
        )
    );

-- Update the respond_to_invitation function to handle the unique constraint properly
CREATE OR REPLACE FUNCTION public.respond_to_invitation(
    invitation_id_param UUID,
    response_param TEXT -- 'accepted' or 'declined'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    invitation_record RECORD;
    user_email TEXT;
BEGIN
    -- Get current user's email
    SELECT email::TEXT INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.doctor_invitations
    WHERE id = invitation_id_param
    AND (patient_email = user_email OR patient_id = auth.uid())
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invitation not found or already responded to');
    END IF;
    
    -- Validate response
    IF response_param NOT IN ('accepted', 'declined') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid response. Must be accepted or declined');
    END IF;
    
    -- Update invitation
    UPDATE public.doctor_invitations
    SET status = response_param,
        patient_id = auth.uid(),
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_id_param;
    
    -- If accepted, create doctor-patient relationship
    IF response_param = 'accepted' THEN
        -- Use INSERT with ON CONFLICT that matches our unique constraint
        INSERT INTO public.doctor_user_access (doctor_id, patient_id, granted_at)
        VALUES (invitation_record.doctor_id, auth.uid(), NOW())
        ON CONFLICT (doctor_id, patient_id) DO NOTHING;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Invitation accepted. Doctor has been added to your care team.'
        );
    ELSE
        RETURN json_build_object(
            'success', true, 
            'message', 'Invitation declined.'
        );
    END IF;
END;
$$; 