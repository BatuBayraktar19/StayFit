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
  note: string | null;
};

export type WorkoutSet = {
  id: string;
  exercise_id: string;
  order_index: number;
  weight: number | null;
  reps: number | null;
  reps_right: number | null;
  reps_left: number | null;
  is_warmup: boolean;
  note: string | null;
};
