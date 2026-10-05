/*
# Create quality_checks table

## Overview
Add a dedicated table for quality control checks performed by quality agents.

## New table: quality_checks
- id (uuid, PK)
- of_reference (text, NOT NULL) — the OF being checked
- location_id (uuid, references locations) — where the check happened
- location_name (text) — denormalized for history
- user_id (uuid, NOT NULL, DEFAULT auth.uid()) — who performed the check
- user_name (text) — denormalized
- result (text, NOT NULL) — 'passed' or 'failed'
- defect_description (text, nullable) — required when result is failed
- comment (text, nullable)
- created_at (timestamptz, DEFAULT now())

## Security
- RLS enabled.
- SELECT: all authenticated users.
- INSERT: authenticated users (user_id defaults to auth.uid()).
- UPDATE/DELETE: admin only.
*/

CREATE TABLE IF NOT EXISTS public.quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  of_reference text NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  result text NOT NULL CHECK (result IN ('passed', 'failed')),
  defect_description text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_checks_select_authenticated" ON public.quality_checks;
CREATE POLICY "quality_checks_select_authenticated"
  ON public.quality_checks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "quality_checks_insert_authenticated" ON public.quality_checks;
CREATE POLICY "quality_checks_insert_authenticated"
  ON public.quality_checks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quality_checks_update_admin" ON public.quality_checks;
CREATE POLICY "quality_checks_update_admin"
  ON public.quality_checks FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = 'admin');

DROP POLICY IF EXISTS "quality_checks_delete_admin" ON public.quality_checks;
CREATE POLICY "quality_checks_delete_admin"
  ON public.quality_checks FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = 'admin');
