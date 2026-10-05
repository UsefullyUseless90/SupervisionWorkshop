import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = 'operator' | 'supervisor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  matricule: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  zone: string | null;
  created_at: string;
  created_by: string | null;
}

export type ScanMethod = 'pda' | 'barcode_reader' | 'camera' | 'ocr' | 'manual';

export type AnomalyType =
  | 'unknown_reference'
  | 'same_location'
  | 'empty_read'
  | 'duplicate_scan';

export interface Movement {
  id: string;
  of_reference: string;
  previous_location_id: string | null;
  previous_location_name: string | null;
  new_location_id: string | null;
  new_location_name: string;
  user_id: string;
  user_name: string;
  scan_method: ScanMethod | null;
  comment: string | null;
  status: 'valid' | 'anomaly';
  anomaly_type: AnomalyType | null;
  created_at: string;
}

export interface AppSettings {
  id: number;
  inactivity_threshold_days: number;
  updated_at: string;
  updated_by: string | null;
}

export interface ReportRecipient {
  id: string;
  email: string;
  created_at: string;
  created_by: string | null;
}
