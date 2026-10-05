/*
# Add scan_type and duration_elapsed_minutes to movements

## Overview
Transform the movement tracking into a start/end scan system. Each movement
now records whether it's a "start" scan (OF arriving at a location) or an
"end" scan (OF leaving a location). When an end scan is recorded, the
elapsed time since the corresponding start scan is calculated and stored.

## Changes to movements table
- `scan_type` (text, NOT NULL, DEFAULT 'start') — 'start' or 'end'
- `duration_elapsed_minutes` (integer, nullable) — elapsed time in minutes
  between the start scan and the end scan. Only set on 'end' scans.

## Security
No policy changes needed — existing movement policies apply to all rows.
*/

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS scan_type text NOT NULL DEFAULT 'start'
  CHECK (scan_type IN ('start', 'end'));

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS duration_elapsed_minutes integer;
