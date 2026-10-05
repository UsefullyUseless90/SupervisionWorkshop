/*
# Add missing email identity for the initial administrator

## Overview
The initial administrator was inserted directly into `auth.users`. Supabase
Auth also requires a matching row in `auth.identities` for password login.
Without that identity, the credentials can be correct while login still fails.

## Changes
- Add the email provider identity for `AC_TICP_001@workshop.local`.
- Set `provider_id` to the internal login email.
- Link the identity to the existing administrator user.

## Security
- No public access is added.
- The identity is attached only to the existing administrator account.
- No password or secret is stored by this migration.

## Important notes
1. The operation is idempotent and will not create a duplicate identity.
2. The application continues to display and request the matricule, not the internal email.
*/

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.email,
  now(),
  now()
FROM auth.users u
WHERE u.email = 'AC_TICP_001@workshop.local'
  AND NOT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = u.id
      AND i.provider = 'email'
  );
