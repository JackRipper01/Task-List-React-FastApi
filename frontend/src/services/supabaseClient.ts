// src/lib/supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
    // Optionally throw an error or handle this more gracefully for production,
    // but for development, a console error is usually sufficient.
    // throw new Error('Supabase credentials are not configured.');
}

/**
 * Initializes and exports the Supabase client.
 * This client is used for all interactions with your Supabase project,
 * including authentication and database operations.
 */
export const supabase: SupabaseClient = createClient(
    supabaseUrl,
    supabaseAnonKey
);

console.log("Supabase client initialized.");