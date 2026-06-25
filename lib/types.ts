export type Program = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

export type WorkoutSession = {
  id: string;
  program_id: string;
  name: string;
  date: string;
  notes: string | null;
  created_at: string;
};

export type Exercise = {
  id: string;
  session_id: string;
  name: string;
  order_index: number;
};

export type BodyWeightEntry = {
  id: string;
  date: string;
  weight: number;
  note: string | null;
};

export type ProgressPhoto = {
  id: string;
  date: string;
  uri: string;
  type: 'photo' | 'video';
  note: string | null;
};

export type FoodEntry = {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type NutritionGoal = {
  calories: number;
  protein: number | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: { name: string; order_index: number }[];
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  exercise_id: string;
  order_index: number;
  weight: number | null;
  reps: number | null;
  reps_right: number | null;
  reps_left: number | null;
  is_bilateral: boolean;
  is_warmup: boolean;
  note: string | null;
};
