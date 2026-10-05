/*
# Create OF Tracking Schema

## Overview
This migration creates the complete database schema for the physical tracking
of Manufacturing Orders (Ordres de Fabrication / OF) in an industrial workshop.
It enables scanning OF references (via barcode/QR/camera), recording movements
between physical locations, and viewing full movement history.

## 1. New Tables

### profiles
- Extends auth.users with role information.
- `id` (uuid, PK, references auth.users)
- `email` (text)
- `full_name` (text)
- `role` (text: 'operator' | 'supervisor' | 'admin')
- `created_at` (timestamptz)

### of_references
- Referential of known/authorized OF references. Optional depending on app mode.
- `id` (uuid, PK)
- `reference` (text, unique) — the OF reference exactly as it appears on the physical folder
- `description` (text, nullable) — optional description
- `created_at` (timestamptz)
- `created_by` (uuid, references auth.users)

### locations
- Physical locations in the workshop (zones, shelves, workstations, etc.)
- `id` (uuid, PK)
- `code` (text, unique) — the barcode/QR code value that identifies the location
- `name` (text) — human-readable name
- `zone` (text, nullable) — optional grouping zone
- `created_at` (timestamptz)
- `created_by` (uuid, references auth.users)

### movements
- Immutable history of all OF movements. Never overwritten.
- `id` (uuid, PK)
- `of_reference` (text, not null) — the OF reference exactly as scanned
- `previous_location_id` (uuid, nullable, references locations) — null if first movement
- `previous_location_name` (text, nullable) — denormalized for history readability
- `new_location_id` (uuid, nullable, references locations)
- `new_location_name` (text, not null) — denormalized for history readability
- `user_id` (uuid, not null, references auth.users)
- `user_name` (text, not null) — denormalized
- `scan_method` (text, nullable) — 'pda' | 'barcode_reader' | 'camera' | 'ocr' | 'manual'
- `is_recognized` (boolean, default true) — whether the OF was in the referential
- `comment` (text, nullable)
- `status` (text, default 'valid') — 'valid' | 'anomaly'
- `anomaly_type` (text, nullable) — 'unknown_reference' | 'same_location' | 'empty_read' | 'duplicate_scan'
- `created_at` (timestamptz, default now())

### app_settings
- Application configuration (single row, id = 1)
- `id` (int, PK, default 1)
- `strict_mode` (boolean, default false) — if true, unknown OF references are rejected
- `inactivity_threshold_days` (int, default 3) — days without movement before flagging
- `updated_at` (timestamptz)
- `updated_by` (uuid, references auth.users)

### report_recipients
- Email addresses for the daily report
- `id` (uuid, PK)
- `email` (text, not null)
- `created_at` (timestamptz)
- `created_by` (uuid, references auth.users)

## 2. Security (RLS)

All tables have RLS enabled. Policies are scoped to `authenticated` users:
- All authenticated users can read tracking data (movements, locations, references).
- Only supervisors and admins can manage the referential and locations.
- Only admins can manage users, settings, and report recipients.
- Movement inserts are allowed for all authenticated users (the operator's core action).

Role checks use `raw_app_meta_data->>'role'` which is set during signup
and is NOT user-editable (unlike user_metadata).

## 3. Indexes

- movements.of_reference (frequent lookups by OF reference)
- movements.created_at (daily reports, sorting)
- movements.user_id (user activity)
- movements.new_location_id (distribution by location)
- of_references.reference (lookup during scan)
- locations.code (lookup during scan)
- profiles.role (role-based queries)
*/

-- Enable crypto extension for gen_random_uuid if not already
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'supervisor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated"
ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Only admins can delete
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin"
ON profiles FOR DELETE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- of_references
-- ============================================================
CREATE TABLE IF NOT EXISTS of_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE of_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "of_references_select_authenticated" ON of_references;
CREATE POLICY "of_references_select_authenticated"
ON of_references FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "of_references_insert_supervisor_admin" ON of_references;
CREATE POLICY "of_references_insert_supervisor_admin"
ON of_references FOR INSERT TO authenticated
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'));

DROP POLICY IF EXISTS "of_references_update_supervisor_admin" ON of_references;
CREATE POLICY "of_references_update_supervisor_admin"
ON of_references FOR UPDATE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'))
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'));

DROP POLICY IF EXISTS "of_references_delete_supervisor_admin" ON of_references;
CREATE POLICY "of_references_delete_supervisor_admin"
ON of_references FOR DELETE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'));

-- ============================================================
-- locations
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  zone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_authenticated" ON locations;
CREATE POLICY "locations_select_authenticated"
ON locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "locations_insert_supervisor_admin" ON locations;
CREATE POLICY "locations_insert_supervisor_admin"
ON locations FOR INSERT TO authenticated
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'));

DROP POLICY IF EXISTS "locations_update_supervisor_admin" ON locations;
CREATE POLICY "locations_update_supervisor_admin"
ON locations FOR UPDATE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'))
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'));

DROP POLICY IF EXISTS "locations_delete_supervisor_admin" ON locations;
CREATE POLICY "locations_delete_supervisor_admin"
ON locations FOR DELETE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' IN ('supervisor', 'admin'));

-- ============================================================
-- movements
-- ============================================================
CREATE TABLE IF NOT EXISTS movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  of_reference text NOT NULL,
  previous_location_id uuid REFERENCES locations(id),
  previous_location_name text,
  new_location_id uuid REFERENCES locations(id),
  new_location_name text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  user_name text NOT NULL,
  scan_method text CHECK (scan_method IN ('pda', 'barcode_reader', 'camera', 'ocr', 'manual')),
  is_recognized boolean NOT NULL DEFAULT true,
  comment text,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'anomaly')),
  anomaly_type text CHECK (anomaly_type IN ('unknown_reference', 'same_location', 'empty_read', 'duplicate_scan')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movements_select_authenticated" ON movements;
CREATE POLICY "movements_select_authenticated"
ON movements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "movements_insert_authenticated" ON movements;
CREATE POLICY "movements_insert_authenticated"
ON movements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "movements_update_admin" ON movements;
CREATE POLICY "movements_update_admin"
ON movements FOR UPDATE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- No delete policy: movements are immutable, never deleted via app

-- ============================================================
-- app_settings (single row, id = 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  strict_mode boolean NOT NULL DEFAULT false,
  inactivity_threshold_days int NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_authenticated" ON app_settings;
CREATE POLICY "app_settings_select_authenticated"
ON app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_settings_update_admin" ON app_settings;
CREATE POLICY "app_settings_update_admin"
ON app_settings FOR UPDATE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Initialize the single settings row
INSERT INTO app_settings (id, strict_mode, inactivity_threshold_days)
VALUES (1, false, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- report_recipients
-- ============================================================
CREATE TABLE IF NOT EXISTS report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE report_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_recipients_select_authenticated" ON report_recipients;
CREATE POLICY "report_recipients_select_authenticated"
ON report_recipients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "report_recipients_insert_admin" ON report_recipients;
CREATE POLICY "report_recipients_insert_admin"
ON report_recipients FOR INSERT TO authenticated
WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "report_recipients_delete_admin" ON report_recipients;
CREATE POLICY "report_recipients_delete_admin"
ON report_recipients FOR DELETE TO authenticated
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_movements_of_reference ON movements(of_reference);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_new_location_id ON movements(new_location_id);
CREATE INDEX IF NOT EXISTS idx_of_references_reference ON of_references(reference);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
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
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'operator')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();