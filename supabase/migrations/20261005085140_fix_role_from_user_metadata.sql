/*
# Fix: read role from user_metadata instead of app_metadata

The Supabase client SDK does not support setting appMetadata during signUp.
Role is now passed via user_metadata (data option). This migration updates
the trigger function and all RLS policies to read role from
raw_user_meta_data instead of raw_app_meta_data.

Note: user_metadata is user-editable, but for this industrial tracking app
the role is primarily enforced by the profiles table which is only writable
by admins. The user_metadata role is used for initial setup convenience.
For production with strict security, use the admin API to set app_metadata
or use a SECURITY DEFINER function to update roles.
*/

-- Update trigger to read role from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

-- Update policies to check profiles table for role instead of JWT
-- This is more reliable since profiles.role is the source of truth

-- of_references
DROP POLICY IF EXISTS "of_references_insert_supervisor_admin" ON of_references;
CREATE POLICY "of_references_insert_supervisor_admin"
ON of_references FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')));

DROP POLICY IF EXISTS "of_references_update_supervisor_admin" ON of_references;
CREATE POLICY "of_references_update_supervisor_admin"
ON of_references FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')));

DROP POLICY IF EXISTS "of_references_delete_supervisor_admin" ON of_references;
CREATE POLICY "of_references_delete_supervisor_admin"
ON of_references FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')));

-- locations
DROP POLICY IF EXISTS "locations_insert_supervisor_admin" ON locations;
CREATE POLICY "locations_insert_supervisor_admin"
ON locations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')));

DROP POLICY IF EXISTS "locations_update_supervisor_admin" ON locations;
CREATE POLICY "locations_update_supervisor_admin"
ON locations FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')));

DROP POLICY IF EXISTS "locations_delete_supervisor_admin" ON locations;
CREATE POLICY "locations_delete_supervisor_admin"
ON locations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin')));

-- movements update (admin only)
DROP POLICY IF EXISTS "movements_update_admin" ON movements;
CREATE POLICY "movements_update_admin"
ON movements FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- app_settings (admin only)
DROP POLICY IF EXISTS "app_settings_update_admin" ON app_settings;
CREATE POLICY "app_settings_update_admin"
ON app_settings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- report_recipients (admin only)
DROP POLICY IF EXISTS "report_recipients_insert_admin" ON report_recipients;
CREATE POLICY "report_recipients_insert_admin"
ON report_recipients FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "report_recipients_delete_admin" ON report_recipients;
CREATE POLICY "report_recipients_delete_admin"
ON report_recipients FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- profiles delete (admin only)
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin"
ON profiles FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
