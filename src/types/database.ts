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
          height_cm: number | null;
          weight_kg: number | null;
          age: number | null;
          sex: "homme" | "femme" | null;
          activity_level: "sedentaire" | "leger" | "modere" | "actif" | "tres_actif" | null;
          nutrition_goal: "perdre" | "maintenir" | "prendre" | null;
          goal_calories: number | null;
          goal_protein: number | null;
          goal_carbs: number | null;
          goal_fat: number | null;
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
      meal_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          occurred_at: string;
          meal_type: "petit-dejeuner" | "dejeuner" | "diner" | "collation" | "autre";
          food_name: string;
          icon: string;
          quantity_grams: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_entries"]["Row"]> & {
          user_id: string;
          entry_date: string;
          food_name: string;
          quantity_grams: number;
          calories: number;
        };
        Update: Partial<Database["public"]["Tables"]["meal_entries"]["Row"]>;
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
export type MealEntry = Database["public"]["Tables"]["meal_entries"]["Row"];
