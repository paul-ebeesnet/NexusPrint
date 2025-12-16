import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kyysngclyaoarfvofclq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNuZ2NseWFvYXJmdm9mY2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MjE5MTIsImV4cCI6MjA4MTA5NzkxMn0.2nuqAwyEhwmseicADpFnJm2B6CNzoFsytvGhhfEn59w';

// Add robust configuration to prevent URL fragment issues and ensure local storage usage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Prevents wouter/router conflicts
  }
});