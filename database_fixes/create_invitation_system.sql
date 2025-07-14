-- Create doctor-patient invitation system
-- This allows doctors to invite patients via email and patients to accept/decline

-- Create doctor_invitations table
CREATE TABLE IF NOT EXISTS public.doctor_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_email TEXT NOT NULL,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Will be NULL until patient accepts
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    message TEXT, -- Optional message from doctor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctor_invitations_doctor_id ON public.doctor_invitations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_invitations_patient_email ON public.doctor_invitations(patient_email);
CREATE INDEX IF NOT EXISTS idx_doctor_invitations_patient_id ON public.doctor_invitations(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_invitations_status ON public.doctor_invitations(status);

-- Enable RLS
ALTER TABLE public.doctor_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (optimized to prevent re-evaluation warnings)
-- Doctors can see their own invitations
CREATE POLICY "Doctors can view their own invitations" ON public.doctor_invitations
    FOR SELECT USING (doctor_id = (SELECT auth.uid()));

-- Doctors can insert their own invitations
CREATE POLICY "Doctors can create invitations" ON public.doctor_invitations
    FOR INSERT WITH CHECK (doctor_id = (SELECT auth.uid()));

-- Doctors can update their own invitations (e.g., cancel them)
CREATE POLICY "Doctors can update their own invitations" ON public.doctor_invitations
    FOR UPDATE USING (doctor_id = (SELECT auth.uid()));

-- Patients can see invitations sent to their email
CREATE POLICY "Patients can view invitations sent to them" ON public.doctor_invitations
    FOR SELECT USING (
        patient_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        OR patient_id = (SELECT auth.uid())
    );

-- Patients can update invitations sent to them (accept/decline)
CREATE POLICY "Patients can respond to invitations" ON public.doctor_invitations
    FOR UPDATE USING (
        patient_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        OR patient_id = (SELECT auth.uid())
    );

-- Function to send doctor invitation
CREATE OR REPLACE FUNCTION public.send_doctor_invitation(
    patient_email_param TEXT,
    message_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    doctor_user_record RECORD;
    existing_invitation RECORD;
    existing_access RECORD;
    patient_user_record RECORD;
    invitation_id UUID;
BEGIN
    -- Get doctor info
    SELECT ud.name, ud.surname, ud.email, ud.account_type
    INTO doctor_user_record
    FROM public.user_data ud
    WHERE ud.user_id = auth.uid() AND ud.account_type = 'doctor';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Only doctors can send invitations');
    END IF;
    
    -- Validate email format
    IF patient_email_param !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object('success', false, 'error', 'Invalid email format');
    END IF;
    
    -- Check if patient exists and get their info
    SELECT au.id, ud.name, ud.surname
    INTO patient_user_record
    FROM auth.users au
    LEFT JOIN public.user_data ud ON au.id = ud.user_id
    WHERE au.email = patient_email_param;
    
    -- If patient exists, check if already connected
    IF FOUND THEN
        SELECT * INTO existing_access
        FROM public.doctor_user_access
        WHERE doctor_id = auth.uid() AND patient_id = patient_user_record.id;
        
        IF FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Patient is already connected to your practice');
        END IF;
    END IF;
    
    -- Check for existing pending invitation
    SELECT * INTO existing_invitation
    FROM public.doctor_invitations
    WHERE doctor_id = auth.uid() 
    AND patient_email = patient_email_param 
    AND status = 'pending';
    
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invitation already sent to this email');
    END IF;
    
    -- Create invitation
    INSERT INTO public.doctor_invitations (
        doctor_id,
        patient_email,
        patient_id,
        message,
        status
    ) VALUES (
        auth.uid(),
        patient_email_param,
        patient_user_record.id, -- Will be NULL if patient doesn't exist yet
        message_param,
        'pending'
    ) RETURNING id INTO invitation_id;
    
    RETURN json_build_object(
        'success', true, 
        'invitation_id', invitation_id,
        'patient_exists', (patient_user_record.id IS NOT NULL),
        'message', 'Invitation sent successfully'
    );
END;
$$;

-- Function to respond to invitation
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

-- Function to get pending invitations for current user (patient)
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

-- Function to get current patient's doctors
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

-- Trigger to update updated_at timestamp
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

CREATE TRIGGER update_doctor_invitations_updated_at
    BEFORE UPDATE ON public.doctor_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_invitation_updated_at();

-- Ensure unique constraint exists on doctor_user_access for ON CONFLICT
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.doctor_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_doctor_invitation(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_invitation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_pending_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_doctors() TO authenticated; 