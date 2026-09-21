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
          water_goal_ml: number;
          caffeine_limit_mg: number;
          theme: "light" | "dark" | "system";
          sugar_limit_g: number;
          sport_weekly_goal: number;
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
      foods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          category: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          sugar: number;
          sodium: number;
          caffeine: number;
          unit: "g" | "ml";
          portion_label: string | null;
          portion_grams: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["foods"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["foods"]["Row"]>;
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
          fiber: number;
          sugar: number;
          sodium: number;
          caffeine: number;
          unit: "g" | "ml";
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
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          weight_kg: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["weight_logs"]["Row"]> & {
          user_id: string;
          entry_date: string;
          weight_kg: number;
        };
        Update: Partial<Database["public"]["Tables"]["weight_logs"]["Row"]>;
        Relationships: [];
      };
      water_logs: {
        Row: {
          user_id: string;
          entry_date: string;
          ml: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["water_logs"]["Row"]> & {
          user_id: string;
          entry_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["water_logs"]["Row"]>;
        Relationships: [];
      };
      meal_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_templates"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_templates"]["Row"]>;
        Relationships: [];
      };
      meal_template_items: {
        Row: {
          id: string;
          template_id: string;
          user_id: string;
          food_id: string | null;
          food_name: string;
          icon: string;
          quantity_grams: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          sugar: number;
          sodium: number;
          caffeine: number;
          unit: "g" | "ml";
        };
        Insert: Partial<Database["public"]["Tables"]["meal_template_items"]["Row"]> & {
          template_id: string;
          user_id: string;
          food_name: string;
          quantity_grams: number;
          calories: number;
        };
        Update: Partial<Database["public"]["Tables"]["meal_template_items"]["Row"]>;
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
export type Food = Database["public"]["Tables"]["foods"]["Row"];
export type WeightLog = Database["public"]["Tables"]["weight_logs"]["Row"];
export type WaterLog = Database["public"]["Tables"]["water_logs"]["Row"];
export type MealTemplate = Database["public"]["Tables"]["meal_templates"]["Row"];
export type MealTemplateItem = Database["public"]["Tables"]["meal_template_items"]["Row"];
