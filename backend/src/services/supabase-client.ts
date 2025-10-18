import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client for real-time features and auth
 *
 * Use this for:
 * - Real-time subscriptions (task updates, etc.)
 * - Supabase Auth (if not using custom auth)
 * - Storage (file uploads)
 *
 * For database queries, use Prisma instead (src/services/database.ts)
 */

let supabase: SupabaseClient;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env'
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

// Export singleton instance
const supabaseClient = getSupabaseClient();
export default supabaseClient;

/**
 * Example Usage: Real-time Task Updates
 *
 * import supabase from './services/supabase-client';
 *
 * // Subscribe to task updates
 * const subscription = supabase
 *   .channel('task-updates')
 *   .on(
 *     'postgres_changes',
 *     {
 *       event: 'UPDATE',
 *       schema: 'public',
 *       table: 'tasks',
 *     },
 *     (payload) => {
 *       console.log('Task updated:', payload.new);
 *       // Broadcast to connected WebSocket clients
 *     }
 *   )
 *   .subscribe();
 *
 * // Clean up
 * subscription.unsubscribe();
 */
