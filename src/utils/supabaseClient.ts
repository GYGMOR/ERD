import { createClient } from '@supabase/supabase-js';

// Nutze die Umgebungsvariablen für Supabase (VITE_ prefix in Vite.js)
// Diese müssen in deiner .env oder .env.local Umgebung gesetzt sein!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL oder Anon Key fehlen. Prüfe deine .env Datei!');
}

/**
 * Der offizielle Supabase Client.
 * Kann in beliebigen Frontend-Komponenten importiert werden, 
 * um direkt mit der Supabase Datenbank oder Auth zu interagieren.
 * 
 * @example
 * import { supabase } from '../utils/supabaseClient';
 * const { data, error } = await supabase.from('tickets').select('*');
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debug-Log für die Konsole (nur in Dev oder wenn Variablen da sind)
if (supabaseUrl && supabaseUrl !== 'your-supabase-url.supabase.co') {
  console.log('✅ Supabase Client initialisiert für:', supabaseUrl);
}
