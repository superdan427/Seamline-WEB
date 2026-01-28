// Import Supabase from CDN for browser ES modules
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://vnorasexpaddfkznlbjn.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub3Jhc2V4cGFkZGZrem5sYmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDQxMTUsImV4cCI6MjA4MTgyMDExNX0.d5mS2Oo6X9K1BV0nj7IdY0KxMsM4s_vZunJ3JR64nr8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
