import AsyncStorage from '@react-native-async-storage/async-storage';
import { Program, WorkoutSession, Exercise, ExerciseType, WorkoutSet, BodyWeightEntry, ProgressPhoto, FoodEntry, NutritionGoal, WorkoutTemplate, PlannedWorkout, BodyMeasurement, MeasurementType } from './types';

const KEYS = {
  programs: 'programs',
  sessions: 'sessions',
  exercises: 'exercises',
  sets: 'sets',
  bodyweight: 'bodyweight',
  photos: 'photos',
  food: 'food',
  nutritionGoal: 'nutritionGoal',
  plannedWorkouts: 'plannedWorkouts',
  bodyMeasurements: 'bodyMeasurements',
};

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function get<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

async function save<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export const db = {
  programs: {
    async getAll(): Promise<Program[]> {
      return get<Program>(KEYS.programs);
    },
    async create(name: string): Promise<Program> {
      const programs = await get<Program>(KEYS.programs);
      const p: Program = {
        id: uuid(),
        name,
        user_id: 'local',
        created_at: new Date().toISOString(),
      };
      await save(KEYS.programs, [...programs, p]);
      return p;
    },
    async delete(id: string): Promise<void> {
      const programs = await get<Program>(KEYS.programs);
      await save(KEYS.programs, programs.filter(p => p.id !== id));
    },
  },

  sessions: {
    async getByProgram(programId: string): Promise<WorkoutSession[]> {
      const all = await get<WorkoutSession>(KEYS.sessions);
      return all
        .filter(s => s.program_id === programId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    async create(programId: string, name: string, date: string): Promise<WorkoutSession> {
      const all = await get<WorkoutSession>(KEYS.sessions);
      const s: WorkoutSession = {
        id: uuid(),
        program_id: programId,
        name,
        date,
        notes: null,
        created_at: new Date().toISOString(),
        started_at: null,
        duration_minutes: null,
      };
      await save(KEYS.sessions, [...all, s]);
      return s;
    },
    async rename(id: string, name: string): Promise<void> {
      const all = await get<WorkoutSession>(KEYS.sessions);
      await save(KEYS.sessions, all.map(s => s.id === id ? { ...s, name } : s));
    },
    async setStartedAt(id: string, startedAt: string): Promise<void> {
      const all = await get<WorkoutSession>(KEYS.sessions);
      await save(KEYS.sessions, all.map(s => s.id === id ? { ...s, started_at: startedAt } : s));
    },
    async setDuration(id: string, minutes: number): Promise<void> {
      const all = await get<WorkoutSession>(KEYS.sessions);
      await save(KEYS.sessions, all.map(s => s.id === id ? { ...s, duration_minutes: minutes } : s));
    },
    async delete(id: string): Promise<void> {
      const all = await get<WorkoutSession>(KEYS.sessions);
      await save(KEYS.sessions, all.filter(s => s.id !== id));
      const exercises = await get<Exercise>(KEYS.exercises);
      const toDelete = exercises.filter(e => e.session_id === id).map(e => e.id);
      await save(KEYS.exercises, exercises.filter(e => e.session_id !== id));
      const sets = await get<WorkoutSet>(KEYS.sets);
      await save(KEYS.sets, sets.filter(s => !toDelete.includes(s.exercise_id)));
    },
  },

  exercises: {
    async getBySession(sessionId: string): Promise<Exercise[]> {
      const all = await get<Exercise>(KEYS.exercises);
      return all.filter(e => e.session_id === sessionId).sort((a, b) => a.order_index - b.order_index);
    },
    async create(sessionId: string, name: string, orderIndex: number, type: ExerciseType = 'strength'): Promise<Exercise> {
      const all = await get<Exercise>(KEYS.exercises);
      const e: Exercise = { id: uuid(), session_id: sessionId, name, order_index: orderIndex, superset_group: null, type, cardio_note: null };
      await save(KEYS.exercises, [...all, e]);
      return e;
    },
    async delete(id: string): Promise<void> {
      const all = await get<Exercise>(KEYS.exercises);
      await save(KEYS.exercises, all.filter(e => e.id !== id));
      const sets = await get<WorkoutSet>(KEYS.sets);
      await save(KEYS.sets, sets.filter(s => s.exercise_id !== id));
    },
    async rename(id: string, name: string): Promise<void> {
      const all = await get<Exercise>(KEYS.exercises);
      await save(KEYS.exercises, all.map(e => e.id === id ? { ...e, name } : e));
    },
    async setGroup(id: string, group: string | null): Promise<void> {
      const all = await get<Exercise>(KEYS.exercises);
      await save(KEYS.exercises, all.map(e => e.id === id ? { ...e, superset_group: group } : e));
    },
    async setCardioNote(id: string, note: string | null): Promise<void> {
      const all = await get<Exercise>(KEYS.exercises);
      await save(KEYS.exercises, all.map(e => e.id === id ? { ...e, cardio_note: note } : e));
    },
  },

  bodyweight: {
    async getAll(): Promise<BodyWeightEntry[]> {
      const all = await get<BodyWeightEntry>(KEYS.bodyweight);
      return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    async add(weight: number, date: string, note?: string): Promise<BodyWeightEntry> {
      const all = await get<BodyWeightEntry>(KEYS.bodyweight);
      const entry: BodyWeightEntry = { id: uuid(), date, weight, note: note ?? null };
      await save(KEYS.bodyweight, [...all, entry]);
      return entry;
    },
    async delete(id: string): Promise<void> {
      const all = await get<BodyWeightEntry>(KEYS.bodyweight);
      await save(KEYS.bodyweight, all.filter(e => e.id !== id));
    },
  },

  photos: {
    async getAll(): Promise<ProgressPhoto[]> {
      const all = await get<ProgressPhoto>(KEYS.photos);
      return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    async add(uri: string, date: string, type: 'photo' | 'video' = 'photo', note?: string): Promise<ProgressPhoto> {
      const all = await get<ProgressPhoto>(KEYS.photos);
      const entry: ProgressPhoto = { id: uuid(), date, uri, type, note: note ?? null };
      await save(KEYS.photos, [...all, entry]);
      return entry;
    },
    async delete(id: string): Promise<void> {
      const all = await get<ProgressPhoto>(KEYS.photos);
      await save(KEYS.photos, all.filter(e => e.id !== id));
    },
  },

  food: {
    async getByDate(date: string): Promise<FoodEntry[]> {
      const all = await get<FoodEntry>(KEYS.food);
      return all.filter(f => f.date === date);
    },
    async getAll(): Promise<FoodEntry[]> {
      return get<FoodEntry>(KEYS.food);
    },
    async add(entry: Omit<FoodEntry, 'id'>): Promise<FoodEntry> {
      const all = await get<FoodEntry>(KEYS.food);
      const f: FoodEntry = { id: uuid(), ...entry };
      await save(KEYS.food, [...all, f]);
      return f;
    },
    async update(id: string, data: Partial<Omit<FoodEntry, 'id'>>): Promise<void> {
      const all = await get<FoodEntry>(KEYS.food);
      await save(KEYS.food, all.map(f => f.id === id ? { ...f, ...data } : f));
    },
    async delete(id: string): Promise<void> {
      const all = await get<FoodEntry>(KEYS.food);
      await save(KEYS.food, all.filter(f => f.id !== id));
    },
  },

  nutritionGoal: {
    async get(): Promise<NutritionGoal> {
      const raw = await AsyncStorage.getItem(KEYS.nutritionGoal);
      return raw ? JSON.parse(raw) : { calories: 2000, protein: null };
    },
    async set(goal: NutritionGoal): Promise<void> {
      await AsyncStorage.setItem(KEYS.nutritionGoal, JSON.stringify(goal));
    },
  },

  templates: {
    async getAll(): Promise<WorkoutTemplate[]> {
      const all = await get<WorkoutTemplate>('templates');
      return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    async create(name: string, exercises: { name: string; order_index: number }[]): Promise<WorkoutTemplate> {
      const all = await get<WorkoutTemplate>('templates');
      const t: WorkoutTemplate = { id: uuid(), name, exercises, created_at: new Date().toISOString() };
      await save('templates', [...all, t]);
      return t;
    },
    async delete(id: string): Promise<void> {
      const all = await get<WorkoutTemplate>('templates');
      await save('templates', all.filter(t => t.id !== id));
    },
  },

  sets: {
    async getByExercise(exerciseId: string): Promise<WorkoutSet[]> {
      const all = await get<WorkoutSet>(KEYS.sets);
      return all.filter(s => s.exercise_id === exerciseId).sort((a, b) => a.order_index - b.order_index);
    },
    async create(exerciseId: string, data: Omit<WorkoutSet, 'id' | 'exercise_id'>): Promise<WorkoutSet> {
      const all = await get<WorkoutSet>(KEYS.sets);
      const s: WorkoutSet = { id: uuid(), exercise_id: exerciseId, ...data };
      await save(KEYS.sets, [...all, s]);
      return s;
    },
    async update(id: string, data: Partial<WorkoutSet>): Promise<void> {
      const all = await get<WorkoutSet>(KEYS.sets);
      await save(KEYS.sets, all.map(s => s.id === id ? { ...s, ...data } : s));
    },
    async delete(id: string): Promise<void> {
      const all = await get<WorkoutSet>(KEYS.sets);
      await save(KEYS.sets, all.filter(s => s.id !== id));
    },
  },

  plannedWorkouts: {
    async getAll(): Promise<PlannedWorkout[]> {
      const all = await get<PlannedWorkout>(KEYS.plannedWorkouts);
      return all.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? '').localeCompare(b.time ?? ''));
    },
    async getByProgram(programId: string): Promise<PlannedWorkout[]> {
      const all = await this.getAll();
      return all.filter(p => p.program_id === programId);
    },
    async create(data: Omit<PlannedWorkout, 'id' | 'created_at'>): Promise<PlannedWorkout> {
      const all = await get<PlannedWorkout>(KEYS.plannedWorkouts);
      const p: PlannedWorkout = { id: uuid(), created_at: new Date().toISOString(), ...data };
      await save(KEYS.plannedWorkouts, [...all, p]);
      return p;
    },
    async delete(id: string): Promise<void> {
      const all = await get<PlannedWorkout>(KEYS.plannedWorkouts);
      await save(KEYS.plannedWorkouts, all.filter(p => p.id !== id));
    },
  },

  bodyMeasurements: {
    async getAll(): Promise<BodyMeasurement[]> {
      const all = await get<BodyMeasurement>(KEYS.bodyMeasurements);
      return all.sort((a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : 0);
    },
    async getLatest(): Promise<Partial<Record<MeasurementType, BodyMeasurement>>> {
      const all = await this.getAll();
      const latest: Partial<Record<MeasurementType, BodyMeasurement>> = {};
      for (const m of all) {
        if (!latest[m.type]) latest[m.type] = m;
      }
      return latest;
    },
    async getByType(type: MeasurementType): Promise<BodyMeasurement[]> {
      const all = await this.getAll();
      return all.filter(m => m.type === type);
    },
    async add(type: MeasurementType, value: number, date: string): Promise<BodyMeasurement> {
      const all = await get<BodyMeasurement>(KEYS.bodyMeasurements);
      const m: BodyMeasurement = { id: uuid(), type, value, date };
      await save(KEYS.bodyMeasurements, [...all, m]);
      return m;
    },
    async delete(id: string): Promise<void> {
      const all = await get<BodyMeasurement>(KEYS.bodyMeasurements);
      await save(KEYS.bodyMeasurements, all.filter(m => m.id !== id));
    },
  },
};
