import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'created_at' | 'updated_at'>;
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
        Insert: Omit<Database['public']['Tables']['game_sessions']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['game_sessions']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['world_events']['Row'], 'created_at'>;
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
        Insert: Omit<Database['public']['Tables']['multiplayer_players']['Row'], 'last_seen'>;
        Update: Partial<Database['public']['Tables']['multiplayer_players']['Insert']>;
      };
    };
  };
}
