import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

/** True when env credentials exist (may still fail DNS / network at runtime). */
export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey);

/** Flip to true after a hard network/DNS failure so UI can show offline. */
let runtimeOffline = false;
export function isSupabaseRuntimeOffline(): boolean {
  return !SUPABASE_CONFIGURED || runtimeOffline;
}
export function markSupabaseOffline(reason?: string): void {
  if (runtimeOffline) return;
  runtimeOffline = true;
  if (typeof console !== 'undefined') {
    console.warn(
      '[ironhaven] Supabase unreachable — offline mode' +
        (reason ? `: ${reason}` : '')
    );
  }
}

// Offline / no-op stub so the app boots without Supabase credentials.
// Every query/mutation resolves to an empty result; the persistence layer
// already handles failure by switching to localStorage-only mode.
function createOfflineStub(): SupabaseClient {
  const query: any = {
    select: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    eq: () => query,
    gte: () => query,
    lte: () => query,
    maybeSingle: () =>
      Promise.resolve({ data: null, error: { message: 'offline' } }),
    single: () =>
      Promise.resolve({ data: null, error: { message: 'offline' } }),
    then: (
      resolve: (v: { data: null; error: { message: string } }) => unknown
    ) => resolve({ data: null, error: { message: 'offline' } }),
  };
  const channel: any = {
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => Promise.resolve('ok'),
    send: () => Promise.resolve('ok'),
    presenceState: () => ({}),
  };
  return {
    from: () => query,
    channel: () => channel,
    removeChannel: () => Promise.resolve('ok'),
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createOfflineStub();

if (!SUPABASE_CONFIGURED && typeof window !== 'undefined') {
  console.warn(
    '[ironhaven] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set \u2014 ' +
      'running in offline mode (localStorage persistence, no multiplayer).'
  );
}

// Establish a (persistent) anonymous Supabase session before any DB write so
// every request carries a JWT. The DB stamps `owner = auth.uid()` on insert and
// owner-scoped RLS keys off it, so a player can only touch their own rows. The
// promise is memoized: sign-in happens once, then the session is reused/refreshed.
let authReady: Promise<string | null> | null = null;
export function ensureAuthUser(): Promise<string | null> {
  if (!SUPABASE_CONFIGURED) return Promise.resolve(null);
  if (!authReady) {
    authReady = (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) return session.user.id;

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('[ironhaven] anonymous sign-in failed:', error.message);
        return null;
      }
      return data.user?.id ?? null;
    })();
  }
  return authReady;
}

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          owner: string;
          username: string;
          position_x: number;
          position_y: number;
          position_z: number;
          rotation: number;
          health: number;
          reputation: number;
          wanted: number;
          money: number;
          police_kill_count: number;
          skills: {
            combat: number;
            stealth: number;
            driving: number;
            intimidation: number;
          };
          inventory: string[];
          current_weapon_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['players']['Row'],
          'owner' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      game_sessions: {
        Row: {
          id: string;
          owner: string;
          player_id: string;
          start_time: string;
          end_time: string | null;
          total_kills: number;
          total_money_earned: number;
          max_wanted_level: number;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['game_sessions']['Row'],
          'owner' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['game_sessions']['Insert']
        >;
      };
      world_events: {
        Row: {
          id: string;
          event_type: string;
          location_x: number;
          location_y: number;
          location_z: number;
          severity: number;
          description: string;
          active: boolean;
          created_at: string;
          expires_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['world_events']['Row'],
          'created_at'
        >;
        Update: Partial<Database['public']['Tables']['world_events']['Insert']>;
      };
      multiplayer_players: {
        Row: {
          id: string;
          owner: string;
          username: string;
          position_x: number;
          position_y: number;
          position_z: number;
          rotation: number;
          velocity_x: number;
          velocity_y: number;
          velocity_z: number;
          health: number;
          stamina: number;
          level: number;
          is_in_combat: boolean;
          last_seen: string;
        };
        Insert: Omit<
          Database['public']['Tables']['multiplayer_players']['Row'],
          'owner' | 'last_seen'
        >;
        Update: Partial<
          Database['public']['Tables']['multiplayer_players']['Insert']
        >;
      };
    };
  };
}
