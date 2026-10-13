import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key is missing. Please check your .env file.");
}

export const SUPABASE_URL: string = supabaseUrl || "https://mzxhyjgbbabnughknrxc.supabase.co";
export const SUPABASE_ANON_KEY: string = supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eGh5amdiYmFibnVnaGtucnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTk1NzYsImV4cCI6MjA4NDA3NTU3Nn0.OMPAyQoQbiZKbmN7USAbDk7C4w-glidP1p3Izt_LkRY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
