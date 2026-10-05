/*
# Replace role system with 5 agent categories

## Overview
Replace the old 3-role system with 5 workshop agent categories.

## Steps
1. Drop the old CHECK constraint (which blocks updates to new role values).
2. Migrate existing data: operator -> production, supervisor -> activity_manager.
3. Add the new CHECK constraint with 5 roles.
4. Update auth.users app_metadata for migrated users.

## New roles
- production: scans OFs for advancement tracking, no elapsed time visibility
- quality: controls product validity, confirms no defects
- dpx: department heads, consult all OF info
- activity_manager: activity managers, consult all OF info
- admin: administrator, only role that can add agents
*/

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles SET role = 'production' WHERE role = 'operator';
UPDATE public.profiles SET role = 'activity_manager' WHERE role = 'supervisor';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('production', 'quality', 'dpx', 'activity_manager', 'admin'));

UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"production"')
  WHERE (raw_app_meta_data ->> 'role') = 'operator';

UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"activity_manager"')
  WHERE (raw_app_meta_data ->> 'role') = 'supervisor';
