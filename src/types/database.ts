export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          reminder_time: string | null;
          reminder_timezone: string | null;
          reminded_date: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          category: string;
          target_per_week: number;
          scheduled_days: number[];
          position: number;
          archived: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habits"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Row"]>;
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habit_logs"]["Row"]> & {
          habit_id: string;
          user_id: string;
          log_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["habit_logs"]["Row"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_date: string;
          activity: string;
          duration_minutes: number;
          intensity: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workouts"]["Row"]> & {
          user_id: string;
          workout_date: string;
          activity: string;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Row"]>;
        Relationships: [];
      };
      mood_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          mood_score: number;
          energy_level: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["mood_entries"]["Row"]> & {
          user_id: string;
          entry_date: string;
          mood_score: number;
        };
        Update: Partial<Database["public"]["Tables"]["mood_entries"]["Row"]>;
        Relationships: [];
      };
      moments: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          icon: string;
          text: string;
          occurred_at: string;
          duration_minutes: number | null;
          price: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["moments"]["Row"]> & {
          user_id: string;
          entry_date: string;
          text: string;
        };
        Update: Partial<Database["public"]["Tables"]["moments"]["Row"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]> & {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type MoodEntry = Database["public"]["Tables"]["mood_entries"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Moment = Database["public"]["Tables"]["moments"]["Row"];
