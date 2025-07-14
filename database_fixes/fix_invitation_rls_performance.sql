-- Fix RLS performance issues for doctor_invitations table
-- This addresses PostgreSQL warnings about re-evaluating auth.uid() for each row

-- Drop existing policies to recreate them with optimized versions
DROP POLICY IF EXISTS "Doctors can view their own invitations" ON public.doctor_invitations;
DROP POLICY IF EXISTS "Doctors can create invitations" ON public.doctor_invitations;
DROP POLICY IF EXISTS "Doctors can update their own invitations" ON public.doctor_invitations;
DROP POLICY IF EXISTS "Patients can view invitations sent to them" ON public.doctor_invitations;
DROP POLICY IF EXISTS "Patients can respond to invitations" ON public.doctor_invitations;

-- Recreate policies with optimized auth.uid() calls
-- Doctors can see their own invitations (optimized)
CREATE POLICY "Doctors can view their own invitations" ON public.doctor_invitations
    FOR SELECT USING (doctor_id = (SELECT auth.uid()));

-- Doctors can insert their own invitations (optimized)
CREATE POLICY "Doctors can create invitations" ON public.doctor_invitations
    FOR INSERT WITH CHECK (doctor_id = (SELECT auth.uid()));

-- Doctors can update their own invitations (optimized)
CREATE POLICY "Doctors can update their own invitations" ON public.doctor_invitations
    FOR UPDATE USING (doctor_id = (SELECT auth.uid()));

-- Patients can see invitations sent to their email (optimized)
CREATE POLICY "Patients can view invitations sent to them" ON public.doctor_invitations
    FOR SELECT USING (
        patient_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        OR patient_id = (SELECT auth.uid())
    );

-- Patients can update invitations sent to them (optimized)
CREATE POLICY "Patients can respond to invitations" ON public.doctor_invitations
    FOR UPDATE USING (
        patient_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        OR patient_id = (SELECT auth.uid())
    ); 