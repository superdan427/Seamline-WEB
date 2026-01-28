// ============================================================================
// CONFIGURATION LOADER (Safe to commit)
// ============================================================================
// This file tries to load config.local.js (which is gitignored).
// If config.local.js doesn't exist, it falls back to placeholder values.
//
// SETUP INSTRUCTIONS:
// 1. Copy config.example.js to config.local.js
// 2. Fill in your actual API keys in config.local.js
// 3. Never commit config.local.js (it's in .gitignore)
// ============================================================================

// Default/placeholder values (will be overridden by config.local.js)
window.SUPABASE_URL = window.SUPABASE_URL || "https://vnorasexpaddfkznlbjn.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub3Jhc2V4cGFkZGZrem5sYmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDQxMTUsImV4cCI6MjA4MTgyMDExNX0.d5mS2Oo6X9K1BV0nj7IdY0KxMsM4s_vZunJ3JR64nr8";
window.MAPBOX_TOKEN = window.MAPBOX_TOKEN || "pk.eyJ1Ijoic3VwZXJkYW40MjciLCJhIjoiY21qMDJvajJqMDN0azNlcXpwbmllNmt6ZSJ9.1dYovPj0P4mukRYCXjSgrw";

// Try to dynamically load config.local.js
// Note: This approach works for local development
// For production, you'll need to replace these with actual values during deployment
(async function() {
  try {
    await import('./config.local.js');
    console.log('✓ Loaded configuration from config.local.js');
  } catch (err) {
    console.warn('⚠ config.local.js not found. Using placeholder values.');
    console.warn('⚠ Copy config.example.js to config.local.js and add your API keys.');
  }
})();
