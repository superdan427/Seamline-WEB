// ============================================================================
// CLIENT-SIDE CONFIGURATION TEMPLATE
// ============================================================================
//
// INSTRUCTIONS:
// 1. Copy this file to config.local.js: cp config.example.js config.local.js
// 2. Fill in your actual API keys in config.local.js (NEVER commit it!)
// 3. The app will use config.local.js if it exists, otherwise falls back to config.js
//
// SECURITY NOTES:
// - The Supabase ANON key is safe to expose publicly (it's designed for client-side use)
// - Security relies on Supabase Row Level Security (RLS) policies being properly configured
// - The Mapbox token should have URL restrictions set in your Mapbox dashboard
// ============================================================================

window.SUPABASE_URL = "https://vnorasexpaddfkznlbjn.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub3Jhc2V4cGFkZGZrem5sYmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDQxMTUsImV4cCI6MjA4MTgyMDExNX0.d5mS2Oo6X9K1BV0nj7IdY0KxMsM4s_vZunJ3JR64nr8";

// Mapbox configuration
// Get your token from: https://account.mapbox.com/access-tokens/
window.MAPBOX_TOKEN = "pk.eyJ1Ijoic3VwZXJkYW40MjciLCJhIjoiY21qN2lucnR1MDR5ODNkczg5Zm51YXQ1MCJ9.otpbPkLDOIY3Y14UNoruMQ";
