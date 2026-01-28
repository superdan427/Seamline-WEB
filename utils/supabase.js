const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
const isConfigured =
  typeof SUPABASE_URL === "string" &&
  SUPABASE_URL.startsWith("http") &&
  typeof SUPABASE_ANON_KEY === "string" &&
  SUPABASE_ANON_KEY.length > 20;

const configError = new Error("Supabase is not configured. Set config.js first.");

function noAuth() {
  return Promise.resolve({ data: { user: null, session: null }, error: configError });
}

export const supabase =
  isConfigured && window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : {
        auth: {
          signUp: async () => ({ data: null, error: configError }),
          signInWithPassword: async () => ({ data: null, error: configError }),
          signOut: async () => ({ data: null, error: configError }),
          getUser: noAuth,
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
      };

supabase.isConfigured = isConfigured;
