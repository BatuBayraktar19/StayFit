export type Rank = 'anfänger' | 'fortgeschritten' | 'stark' | 'elite';

export type Standard = {
  exercise: string;
  category: string;
  levels: { anfänger: number; fortgeschritten: number; stark: number; elite: number };
  unit: 'kg';
};

export const STANDARDS: Standard[] = [
  { exercise: 'Bench Press', category: 'Brust', unit: 'kg', levels: { anfänger: 50, fortgeschritten: 80, stark: 110, elite: 140 } },
  { exercise: 'Incline Bench', category: 'Brust', unit: 'kg', levels: { anfänger: 40, fortgeschritten: 65, stark: 90, elite: 120 } },
  { exercise: 'Squat', category: 'Beine', unit: 'kg', levels: { anfänger: 60, fortgeschritten: 100, stark: 140, elite: 180 } },
  { exercise: 'Deadlift', category: 'Rücken', unit: 'kg', levels: { anfänger: 80, fortgeschritten: 130, stark: 180, elite: 230 } },
  { exercise: 'Overhead Press', category: 'Schulter', unit: 'kg', levels: { anfänger: 30, fortgeschritten: 50, stark: 75, elite: 100 } },
  { exercise: 'Shoulder Press', category: 'Schulter', unit: 'kg', levels: { anfänger: 30, fortgeschritten: 50, stark: 75, elite: 100 } },
  { exercise: 'Barbell Row', category: 'Rücken', unit: 'kg', levels: { anfänger: 50, fortgeschritten: 80, stark: 110, elite: 140 } },
  { exercise: 'Pull-up', category: 'Rücken', unit: 'kg', levels: { anfänger: 0, fortgeschritten: 10, stark: 25, elite: 45 } },
  { exercise: 'Lat Pulldown', category: 'Rücken', unit: 'kg', levels: { anfänger: 40, fortgeschritten: 70, stark: 95, elite: 120 } },
  { exercise: 'Seated Row', category: 'Rücken', unit: 'kg', levels: { anfänger: 50, fortgeschritten: 80, stark: 110, elite: 140 } },
  { exercise: 'Leg Press', category: 'Beine', unit: 'kg', levels: { anfänger: 100, fortgeschritten: 180, stark: 260, elite: 360 } },
  { exercise: 'Leg Extension', category: 'Beine', unit: 'kg', levels: { anfänger: 30, fortgeschritten: 55, stark: 80, elite: 110 } },
  { exercise: 'Leg Curl', category: 'Beine', unit: 'kg', levels: { anfänger: 25, fortgeschritten: 45, stark: 65, elite: 90 } },
  { exercise: 'Dips', category: 'Brust', unit: 'kg', levels: { anfänger: 0, fortgeschritten: 15, stark: 35, elite: 60 } },
  { exercise: 'Bicep Curl', category: 'Arme', unit: 'kg', levels: { anfänger: 10, fortgeschritten: 18, stark: 28, elite: 38 } },
  { exercise: 'Hammer Curl', category: 'Arme', unit: 'kg', levels: { anfänger: 10, fortgeschritten: 18, stark: 28, elite: 38 } },
  { exercise: 'Tricep Pushdown', category: 'Arme', unit: 'kg', levels: { anfänger: 20, fortgeschritten: 35, stark: 50, elite: 70 } },
  { exercise: 'Face Pull', category: 'Schulter', unit: 'kg', levels: { anfänger: 15, fortgeschritten: 30, stark: 45, elite: 60 } },
  { exercise: 'Cable Row', category: 'Rücken', unit: 'kg', levels: { anfänger: 40, fortgeschritten: 70, stark: 100, elite: 130 } },
  { exercise: 'Hip Thrust', category: 'Beine', unit: 'kg', levels: { anfänger: 60, fortgeschritten: 100, stark: 150, elite: 200 } },
];

export function getRank(weight: number, std: Standard): { rank: Rank; next: number | null; progress: number } {
  const { anfänger, fortgeschritten, stark, elite } = std.levels;
  if (weight >= elite) return { rank: 'elite', next: null, progress: 1 };
  if (weight >= stark) return { rank: 'stark', next: elite, progress: (weight - stark) / (elite - stark) };
  if (weight >= fortgeschritten) return { rank: 'stark', next: elite, progress: (weight - fortgeschritten) / (elite - fortgeschritten) };
  if (weight >= anfänger) return { rank: 'fortgeschritten', next: stark, progress: (weight - anfänger) / (stark - anfänger) };
  return { rank: 'anfänger', next: fortgeschritten, progress: weight / anfänger };
}

export const RANK_CONFIG: Record<Rank, { label: string; emoji: string; color: string }> = {
  anfänger:      { label: 'Anfänger',      emoji: '🥉', color: '#cd7f32' },
  fortgeschritten: { label: 'Fortgeschritten', emoji: '🥈', color: '#aaa' },
  stark:         { label: 'Stark',         emoji: '🥇', color: '#f5c400' },
  elite:         { label: 'Elite',         emoji: '👑', color: '#a855f7' },
};
