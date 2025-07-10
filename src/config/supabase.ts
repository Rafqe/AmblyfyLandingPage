import { createClient } from "@supabase/supabase-js";

// Environment variable validation
if (process.env.NODE_ENV === "development") {
  console.log("🔍 Supabase config:", {
    url: process.env.REACT_APP_SUPABASE_URL
      ? "✅ Loaded from .env"
      : "⚠️ Using fallback",
    key: process.env.REACT_APP_SUPABASE_ANON_KEY
      ? "✅ Loaded from .env"
      : "⚠️ Using fallback",
  });
}

// Validate required environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ Missing required environment variables:\n" +
      (!supabaseUrl ? "- REACT_APP_SUPABASE_URL\n" : "") +
      (!supabaseAnonKey ? "- REACT_APP_SUPABASE_ANON_KEY\n" : "") +
      "Please create a .env file with these variables."
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error("❌ REACT_APP_SUPABASE_URL must be a valid URL");
}

// Validate JWT format (basic check)
if (!supabaseAnonKey.includes(".") || supabaseAnonKey.split(".").length !== 3) {
  throw new Error("❌ REACT_APP_SUPABASE_ANON_KEY must be a valid JWT token");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
