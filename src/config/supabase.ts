import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  "https://temkhtebkbcidecterqz.supabase.co";
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbWtodGVia2JjaWRlY3RlcnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MzQwMDYsImV4cCI6MjA2NDUxMDAwNn0.6lK1CuirhFNRB-RVwMc-QPwirWlPUlNEbCjTPOg7B7E";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
