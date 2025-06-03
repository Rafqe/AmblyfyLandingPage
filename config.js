// Configuration for Supabase
const config = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://temkhtebkbcidecterqz.supabase.co",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key",
};

export default config;
