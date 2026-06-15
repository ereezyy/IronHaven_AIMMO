import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey);

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
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createOfflineStub();

if (!SUPABASE_CONFIGURED && typeof window !== 'undefined') {
  console.warn(
    '[ironhaven] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set \u2014 ' +
      'running in offline mode (localStorage persistence, no multiplayer).'
  );
}

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
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
          'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      game_sessions: {
        Row: {
          id: string;
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
          'created_at'
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
          'last_seen'
        >;
        Update: Partial<
          Database['public']['Tables']['multiplayer_players']['Insert']
        >;
      };
    };
  };
}
