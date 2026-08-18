import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_CONFIG } from './config';

/**
 * Custom resilient fetch wrapper with exponential backoff retry and query telemetry
 */
async function resilientFetch(
  url: RequestInfo | URL,
  options: RequestInit = {}
): Promise<Response> {
  const startTime = performance.now();
  let attempt = 0;
  let delay = SUPABASE_CONFIG.retry.initialDelayMs;

  while (attempt <= SUPABASE_CONFIG.retry.maxRetries) {
    try {
      const response = await fetch(url, options);
      const durationMs = Math.round(performance.now() - startTime);

      // Performance Monitoring: Log slow queries
      if (SUPABASE_CONFIG.monitoring.enableQueryLogs) {
        if (durationMs > SUPABASE_CONFIG.monitoring.slowQueryThresholdMs) {
          console.warn(`[Supabase ⚠️ Slow Query] ${url.toString()} took ${durationMs}ms`);
        }
      }

      // Check if retryable server error occurred
      if (
        !response.ok &&
        SUPABASE_CONFIG.retry.retryableStatusCodes.includes(response.status) &&
        attempt < SUPABASE_CONFIG.retry.maxRetries
      ) {
        attempt++;
        await new Promise((res) => setTimeout(res, delay));
        delay = Math.min(delay * SUPABASE_CONFIG.retry.backoffMultiplier, SUPABASE_CONFIG.retry.maxDelayMs);
        continue;
      }

      return response;
    } catch (err: any) {
      if (attempt < SUPABASE_CONFIG.retry.maxRetries) {
        attempt++;
        await new Promise((res) => setTimeout(res, delay));
        delay = Math.min(delay * SUPABASE_CONFIG.retry.backoffMultiplier, SUPABASE_CONFIG.retry.maxDelayMs);
        continue;
      }
      if (SUPABASE_CONFIG.monitoring.enableErrorAlerts) {
        console.error(`[Supabase Network Error] Failed to reach ${url.toString()}:`, err);
      }
      throw err;
    }
  }

  throw new Error(`[Supabase Error] Exceeded max retries (${SUPABASE_CONFIG.retry.maxRetries})`);
}

/**
 * Singleton Supabase Client Instance for Comms
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'comms-supabase-auth-token',
    },
    realtime: {
      params: {
        eventsPerSecond: 25,
      },
    },
    global: {
      fetch: resilientFetch,
      headers: {
        'x-client-info': 'comms-messenger-web@2.2.0',
      },
    },
  }
);

/**
 * Health check utility to verify database connectivity
 */
export async function checkSupabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error && error.code !== 'PGRST116') {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err: any) {
    return { ok: false, latencyMs: Math.round(performance.now() - start), error: err.message };
  }
}

export default supabase;
