/*
# Add matricule column to profiles

## Overview
This migration adds a `matricule` column to the `profiles` table to support
matricule-based authentication instead of email-based login. The matricule
is a unique identifier assigned by the administrator to each agent.

## Changes
- `profiles.matricule` (text, unique, nullable for backward compat) — the agent's matricule (e.g. AC_TICP_001)
- Index on matricule for fast lookups during login

## Security
- No RLS changes. Existing policies remain in place.
- The matricule is stored in `profiles` (not in auth.users metadata) so it's
  manageable by admins through the profiles table.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matricule text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_matricule ON profiles(matricule);
