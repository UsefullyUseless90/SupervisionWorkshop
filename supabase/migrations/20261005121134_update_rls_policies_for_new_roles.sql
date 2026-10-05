/*
# Update RLS policies for new 5-role system

## Overview
Update existing RLS policies that referenced 'supervisor' to now reference
'dpx' and 'activity_manager' (the new supervisor-equivalent roles).

## Affected tables
- locations: insert/update/delete now for dpx + activity_manager + admin
- of_references: insert/update/delete now for dpx + activity_manager + admin

## No changes needed
- movements: SELECT is already true for all authenticated, INSERT checks
  user_id ownership, UPDATE is admin-only — no role names to update.
- profiles: SELECT is true for all authenticated, UPDATE is self-only,
  DELETE is admin-only — no role names to update.
- app_settings: SELECT is true, UPDATE is admin-only — no change.
- report_recipients: SELECT is true, INSERT/DELETE is admin-only — no change.
*/

-- locations
DROP POLICY IF EXISTS "locations_delete_supervisor_admin" ON public.locations;
CREATE POLICY "locations_delete_supervisor_admin"
  ON public.locations FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']));

DROP POLICY IF EXISTS "locations_insert_supervisor_admin" ON public.locations;
CREATE POLICY "locations_insert_supervisor_admin"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']));

DROP POLICY IF EXISTS "locations_update_supervisor_admin" ON public.locations;
CREATE POLICY "locations_update_supervisor_admin"
  ON public.locations FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']))
  WITH CHECK ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']));

-- of_references
DROP POLICY IF EXISTS "of_references_delete_supervisor_admin" ON public.of_references;
CREATE POLICY "of_references_delete_supervisor_admin"
  ON public.of_references FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']));

DROP POLICY IF EXISTS "of_references_insert_supervisor_admin" ON public.of_references;
CREATE POLICY "of_references_insert_supervisor_admin"
  ON public.of_references FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']));

DROP POLICY IF EXISTS "of_references_update_supervisor_admin" ON public.of_references;
CREATE POLICY "of_references_update_supervisor_admin"
  ON public.of_references FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']))
  WITH CHECK ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = ANY (ARRAY['dpx', 'activity_manager', 'admin']));
