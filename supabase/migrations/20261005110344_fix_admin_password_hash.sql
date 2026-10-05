/*
# Fix admin password hash

## Overview
The admin user's password was hashed with bcrypt cost 6 (pgcrypto default)
but Supabase Auth (GoTrue) expects bcrypt cost 10. This re-hashes the
password with the correct cost factor.

## Changes
- Update auth.users.encrypted_password for AC_TICP_001@workshop.local
*/

UPDATE auth.users
SET encrypted_password = crypt('Ziggy@14082011!', gen_salt('bf', 10))
WHERE email = 'AC_TICP_001@workshop.local';
