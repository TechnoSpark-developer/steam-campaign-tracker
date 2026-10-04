import { createClient } from '@supabase/supabase-js'

// Vite only exposes variables that start with VITE_ to browser code.
// They are read from the .env file in the project root (see .env.example).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// False until .env has been filled in. The UI checks this so it can show a
// helpful message instead of crashing on a blank page.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// The single Supabase client shared by the whole app.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null
