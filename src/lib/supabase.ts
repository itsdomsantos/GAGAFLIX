import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Normaliza o Project URL: aceita colares por engano o "RESTful endpoint"
 * (…/rest/v1) ou uma barra no fim — o cliente Supabase precisa só do domínio base.
 */
function cleanUrl(raw: string): string {
  return raw.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
export const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** True quando o dono já ligou o projeto Supabase (ver README → "A tua parte"). */
export const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | null = null;

/** Cliente singleton para componentes client (admin, etc.). */
export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

/** Cliente novo por pedido para código de servidor (sem sessão persistida). */
export function getServerClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
