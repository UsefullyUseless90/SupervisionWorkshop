/*
# Normalize the administrator authentication record

## Overview
The administrator account was created directly in the internal Auth tables,
but its email identity did not match the structure produced by Supabase Auth.
This caused the password token endpoint to return a database error.

## Changes
- Normalize the internal administrator email to lowercase.
- Set the email identity provider ID to the user's UUID, matching Supabase Auth.
- Complete the identity verification metadata.
- Fill the nullable email-change field with an empty value.

## Security
- No permissions or public access are changed.
- The existing password hash is preserved.
- Only the existing administrator record is modified.

## Important notes
1. The visible login remains the matricule `AC_TICP_001`.
2. The application converts the internal synthetic email to lowercase during login.
3. The update is limited to the administrator's known user ID.
*/

UPDATE auth.users
SET
  email = 'ac_ticp_001@workshop.local',
  email_change = ''
WHERE id = '566ca423-3413-43ca-a599-33f396108d97';

UPDATE auth.identities
SET
  provider_id = '566ca423-3413-43ca-a599-33f396108d97',
  identity_data = jsonb_build_object(
    'sub', '566ca423-3413-43ca-a599-33f396108d97',
    'role', 'admin',
    'email', 'ac_ticp_001@workshop.local',
    'full_name', 'Administrateur',
    'email_verified', true,
    'phone_verified', false
  ),
  updated_at = now()
WHERE user_id = '566ca423-3413-43ca-a599-33f396108d97'
  AND provider = 'email';
