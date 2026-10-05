/*
# Bootstrap admin user with matricule

## Overview
Creates the initial administrator account with matricule-based login.
The email is derived from the matricule (internal, never shown to users).
Uses pgcrypto's crypt() for bcrypt password hashing.

## Changes
- Insert into auth.users with email AC_TICP_001@workshop.local
- The existing trigger handle_new_user will auto-create the profile
- Update the profile with matricule and admin role
*/

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  phone
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'AC_TICP_001@workshop.local',
  crypt('Ziggy@14082011!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "admin", "provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Administrateur"}'::jsonb,
  '',
  '',
  '',
  '',
  '',
  ''
);

-- Update the auto-created profile with matricule and admin role
UPDATE profiles
SET matricule = 'AC_TICP_001',
    role = 'admin',
    full_name = 'Administrateur'
WHERE email = 'AC_TICP_001@workshop.local';
