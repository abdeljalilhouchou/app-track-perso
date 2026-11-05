export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          language: "fr" | "en" | "ar";
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
          source: string | null;
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
          muscle_groups: string[];
          template_id: string | null;
          discipline: "general" | "strength" | "calisthenics" | "running" | null;
          calisthenics_program_session_id: string | null;
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
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          muscle_group: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["exercises"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Row"]>;
        Relationships: [];
      };
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          muscle_groups: string[];
          position: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_templates"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_templates"]["Row"]>;
        Relationships: [];
      };
      workout_template_exercises: {
        Row: {
          id: string;
          template_id: string;
          user_id: string;
          exercise_name: string;
          muscle_group: string;
          target_sets: number;
          target_reps: number;
          position: number;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_template_exercises"]["Row"]> & {
          template_id: string;
          user_id: string;
          exercise_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_template_exercises"]["Row"]>;
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          exercise_name: string;
          muscle_group: string;
          exercise_position: number;
          set_number: number;
          reps: number;
          weight_kg: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_sets"]["Row"]> & {
          workout_id: string;
          user_id: string;
          exercise_name: string;
          reps: number;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sets"]["Row"]>;
        Relationships: [];
      };
      calisthenics_exercises: {
        Row: {
          id: string;
          user_id: string | null;
          exercise_key: string;
          category: "push" | "pull" | "legs" | "core" | "skills" | "mobility";
          primary_muscle: string;
          level: "beginner" | "intermediate" | "advanced";
          measurement_type: "reps" | "hold" | "mixed";
          name_fr: string;
          name_en: string;
          name_ar: string;
          description_fr: string;
          description_en: string;
          description_ar: string;
          instructions_fr: string;
          instructions_en: string;
          instructions_ar: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_exercises"]["Row"]> & { exercise_key: string; category: "push" | "pull" | "legs" | "core" | "skills" | "mobility"; name_fr: string; name_en: string; name_ar: string };
        Update: Partial<Database["public"]["Tables"]["calisthenics_exercises"]["Row"]>;
        Relationships: [];
      };
      calisthenics_programs: {
        Row: { id: string; user_id: string; name: string; notes: string; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_programs"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["calisthenics_programs"]["Row"]>;
        Relationships: [];
      };
      calisthenics_program_sessions: {
        Row: { id: string; user_id: string; program_id: string; name: string; position: number; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_program_sessions"]["Row"]> & { user_id: string; program_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["calisthenics_program_sessions"]["Row"]>;
        Relationships: [];
      };
      calisthenics_program_exercises: {
        Row: {
          id: string; user_id: string; program_session_id: string; exercise_id: string | null;
          exercise_name: string; category: "push" | "pull" | "legs" | "core" | "skills" | "mobility";
          measurement_type: "reps" | "hold" | "mixed"; target_sets: number; target_reps: number | null;
          target_hold_seconds: number | null; assistance_kg: number | null; added_weight_kg: number | null;
          notes: string; position: number;
        };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_program_exercises"]["Row"]> & { user_id: string; program_session_id: string; exercise_name: string; category: "push" | "pull" | "legs" | "core" | "skills" | "mobility"; measurement_type: "reps" | "hold" | "mixed" };
        Update: Partial<Database["public"]["Tables"]["calisthenics_program_exercises"]["Row"]>;
        Relationships: [];
      };
      calisthenics_sets: {
        Row: {
          id: string; user_id: string; workout_id: string; exercise_id: string | null; exercise_name: string;
          category: "push" | "pull" | "legs" | "core" | "skills" | "mobility";
          measurement_type: "reps" | "hold" | "mixed"; exercise_position: number; set_number: number;
          reps: number | null; hold_seconds: number | null; assistance_kg: number | null; added_weight_kg: number | null;
          variation: string; notes: string; created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_sets"]["Row"]> & { user_id: string; workout_id: string; exercise_name: string; category: "push" | "pull" | "legs" | "core" | "skills" | "mobility"; measurement_type: "reps" | "hold" | "mixed"; set_number: number };
        Update: Partial<Database["public"]["Tables"]["calisthenics_sets"]["Row"]>;
        Relationships: [];
      };
      calisthenics_skills: {
        Row: {
          id: string; user_id: string; name: string; skill_key: string; current_step: number; target_step: number;
          progression_steps: string[]; measurement_type: "reps" | "hold"; started_on: string | null; notes: string;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_skills"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["calisthenics_skills"]["Row"]>;
        Relationships: [];
      };
      calisthenics_skill_logs: {
        Row: {
          id: string; user_id: string; skill_id: string; workout_id: string | null; logged_on: string; step_index: number;
          step_name: string; reps: number | null; hold_seconds: number | null; notes: string; created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calisthenics_skill_logs"]["Row"]> & { user_id: string; skill_id: string; logged_on: string; step_index: number; step_name: string };
        Update: Partial<Database["public"]["Tables"]["calisthenics_skill_logs"]["Row"]>;
        Relationships: [];
      };
      running_sessions: {
        Row: {
          workout_id: string; user_id: string; name: string;
          run_type: "easy" | "endurance" | "long" | "tempo" | "interval" | "recovery" | "free" | "race";
          distance_km: number; duration_seconds: number; elevation_gain_m: number | null;
          average_heart_rate: number | null; cadence_spm: number | null; created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["running_sessions"]["Row"]> & { workout_id: string; user_id: string; run_type: "easy" | "endurance" | "long" | "tempo" | "interval" | "recovery" | "free" | "race"; distance_km: number; duration_seconds: number };
        Update: Partial<Database["public"]["Tables"]["running_sessions"]["Row"]>;
        Relationships: [];
      };
      running_goals: {
        Row: {
          user_id: string; weekly_distance_km: number | null; weekly_runs: number | null;
          monthly_distance_km: number | null; target_5k_seconds: number | null; target_10k_seconds: number | null;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["running_goals"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["running_goals"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_calisthenics_program: {
        Args: { p_program_id: string | null; p_name: string; p_notes: string; p_sessions: Json };
        Returns: string;
      };
      save_running_session: {
        Args: { p_workout_id: string | null; p_workout_date: string; p_name: string; p_run_type: string; p_distance_km: number; p_duration_seconds: number; p_intensity: number; p_notes: string; p_elevation_gain_m: number | null; p_average_heart_rate: number | null; p_cadence_spm: number | null };
        Returns: string;
      };
      delete_running_session: {
        Args: { p_workout_id: string };
        Returns: string;
      };
    };
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
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type WorkoutTemplate = Database["public"]["Tables"]["workout_templates"]["Row"];
export type WorkoutTemplateExercise = Database["public"]["Tables"]["workout_template_exercises"]["Row"];
export type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"];
export type CalisthenicsExercise = Database["public"]["Tables"]["calisthenics_exercises"]["Row"];
export type CalisthenicsProgram = Database["public"]["Tables"]["calisthenics_programs"]["Row"];
export type CalisthenicsProgramSession = Database["public"]["Tables"]["calisthenics_program_sessions"]["Row"];
export type CalisthenicsProgramExercise = Database["public"]["Tables"]["calisthenics_program_exercises"]["Row"];
export type CalisthenicsSet = Database["public"]["Tables"]["calisthenics_sets"]["Row"];
export type CalisthenicsSkill = Database["public"]["Tables"]["calisthenics_skills"]["Row"];
export type CalisthenicsSkillLog = Database["public"]["Tables"]["calisthenics_skill_logs"]["Row"];
export type RunningSession = Database["public"]["Tables"]["running_sessions"]["Row"];
export type RunningGoal = Database["public"]["Tables"]["running_goals"]["Row"];
