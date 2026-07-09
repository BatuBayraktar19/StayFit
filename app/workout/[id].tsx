import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useColors, ColorScheme } from '../../lib/theme';
import { db } from '../../lib/storage';
import { Exercise, WorkoutSet, WorkoutSession } from '../../lib/types';

type ExerciseWithSets = Exercise & { sets: WorkoutSet[] };

function formatRestTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function SetRow({
  set,
  onUpdate,
  onDelete,
  onStartRest,
  styles,
  Colors,
}: {
  set: WorkoutSet;
  onUpdate: (id: string, data: Partial<WorkoutSet>) => void;
  onDelete: (id: string) => void;
  onStartRest: (seconds: number) => void;
  styles: ReturnType<typeof createStyles>;
  Colors: ColorScheme;
}) {
  const [localWeight, setLocalWeight] = useState(set.weight !== null ? String(set.weight) : '');
  const [localReps, setLocalReps] = useState(set.reps !== null ? String(set.reps) : '');
  const [localRepsRight, setLocalRepsRight] = useState(set.reps_right !== null ? String(set.reps_right) : '');
  const [localRepsLeft, setLocalRepsLeft] = useState(set.reps_left !== null ? String(set.reps_left) : '');
  const [localNote, setLocalNote] = useState(set.note ?? '');

  const isBilateral = set.is_bilateral;

  return (
    <View style={styles.setRow}>
      {set.is_warmup && (
        <View style={styles.warmupBadge}>
          <Text style={styles.warmupText}>warmup</Text>
        </View>
      )}
      <View style={styles.setInputRow}>
        <TextInput
          style={styles.setInput}
          placeholder="kg"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          value={localWeight}
          onChangeText={setLocalWeight}
          onBlur={() => onUpdate(set.id, { weight: localWeight ? parseFloat(localWeight.replace(',', '.')) : null })}
        />
        <Text style={styles.setX}>×</Text>
        {isBilateral ? (
          <>
            <TextInput
              style={styles.setInput}
              placeholder="R"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={localRepsRight}
              onChangeText={setLocalRepsRight}
              onBlur={() => onUpdate(set.id, { reps_right: localRepsRight ? parseFloat(localRepsRight.replace(',', '.')) : null })}
            />
            <Text style={styles.setX}>/</Text>
            <TextInput
              style={styles.setInput}
              placeholder="L"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={localRepsLeft}
              onChangeText={setLocalRepsLeft}
              onBlur={() => onUpdate(set.id, { reps_left: localRepsLeft ? parseFloat(localRepsLeft.replace(',', '.')) : null })}
            />
          </>
        ) : (
          <TextInput
            style={styles.setInput}
            placeholder="reps"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={localReps}
            onChangeText={setLocalReps}
            onBlur={() => onUpdate(set.id, { reps: localReps ? parseFloat(localReps.replace(',', '.')) : null })}
          />
        )}
        <TouchableOpacity
          onPress={() => onStartRest(90)}
          onLongPress={() => Alert.alert('Pause-Dauer', '', [
            { text: '30s', onPress: () => onStartRest(30) },
            { text: '60s', onPress: () => onStartRest(60) },
            { text: '90s', onPress: () => onStartRest(90) },
            { text: '120s', onPress: () => onStartRest(120) },
            { text: '180s', onPress: () => onStartRest(180) },
            { text: 'Abbrechen', style: 'cancel' },
          ])}
          style={styles.timerSetBtn}
        >
          <Text style={styles.timerSetBtnText}>⏱</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(set.id)} style={styles.deleteSetBtn}>
          <Text style={styles.deleteSetText}>✕</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="Notiz..."
        placeholderTextColor={Colors.textMuted}
        value={localNote}
        onChangeText={setLocalNote}
        onBlur={() => onUpdate(set.id, { note: localNote || null })}
      />
    </View>
  );
}

function CardioNoteInput({
  ex, onSave, styles, Colors,
}: {
  ex: ExerciseWithSets;
  onSave: (id: string, note: string) => void;
  styles: ReturnType<typeof createStyles>;
  Colors: ColorScheme;
}) {
  const [note, setNote] = useState(ex.cardio_note ?? '');
  return (
    <TextInput
      style={styles.cardioInput}
      placeholder="z.B. 30 min Laufen, 5km, HF Ø 150..."
      placeholderTextColor={Colors.textMuted}
      value={note}
      onChangeText={setNote}
      onBlur={() => onSave(ex.id, note)}
      multiline
    />
  );
}

function ExerciseBlock({
  ex,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDelete,
  onRenameRequest,
  onStartRest,
  onLinkPress,
  onSaveCardioNote,
  isLinking,
  badge,
  grouped,
  tight,
  styles,
  Colors,
}: {
  ex: ExerciseWithSets;
  onAddSet: (exerciseId: string, warmup: boolean, bilateral: boolean) => void;
  onUpdateSet: (id: string, data: Partial<WorkoutSet>) => void;
  onDeleteSet: (id: string) => void;
  onDelete: (id: string) => void;
  onRenameRequest: (id: string) => void;
  onStartRest: (seconds: number) => void;
  onLinkPress: (id: string) => void;
  onSaveCardioNote: (id: string, note: string) => void;
  isLinking: boolean;
  badge: string | null;
  grouped: boolean;
  tight: boolean;
  styles: ReturnType<typeof createStyles>;
  Colors: ColorScheme;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <View style={[
      styles.exBlock,
      grouped && styles.exBlockGrouped,
      tight && styles.exBlockTight,
      isLinking && styles.exBlockLinking,
    ]}>
      <View style={styles.exHeader}>
        <View style={styles.exNameRow}>
          {ex.type === 'cardio' && <Text style={styles.cardioIcon}>🏃</Text>}
          {badge && (
            <View style={styles.supersetBadge}>
              <Text style={styles.supersetBadgeText}>{badge}</Text>
            </View>
          )}
          <Text style={styles.exName}>{ex.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowOptions(v => !v)}>
          <Text style={styles.exMenu}>•••</Text>
        </TouchableOpacity>
      </View>

      {showOptions && (
        <View style={styles.exOptions}>
          {ex.type !== 'cardio' && (
            <>
              <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onAddSet(ex.id, false, false); setShowOptions(false); }}>
                <Text style={styles.exOptionText}>+ Satz</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onAddSet(ex.id, true, false); setShowOptions(false); }}>
                <Text style={styles.exOptionText}>+ Warmup</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onAddSet(ex.id, false, true); setShowOptions(false); }}>
                <Text style={styles.exOptionText}>+ L/R Satz</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onRenameRequest(ex.id); setShowOptions(false); }}>
            <Text style={styles.exOptionText}>✏️ Umbenennen</Text>
          </TouchableOpacity>
          {ex.type !== 'cardio' && (
            <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onLinkPress(ex.id); setShowOptions(false); }}>
              <Text style={styles.exOptionText}>{ex.superset_group ? '🔓 Superset lösen' : '🔗 Superset verbinden'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.exOptionBtn, { borderColor: Colors.danger }]} onPress={() => onDelete(ex.id)}>
            <Text style={[styles.exOptionText, { color: Colors.danger }]}>Übung löschen</Text>
          </TouchableOpacity>
        </View>
      )}

      {ex.type === 'cardio' ? (
        <CardioNoteInput ex={ex} onSave={onSaveCardioNote} styles={styles} Colors={Colors} />
      ) : (
        <>
          {ex.sets.map(set => (
            <SetRow key={set.id} set={set} onUpdate={onUpdateSet} onDelete={onDeleteSet} onStartRest={onStartRest} styles={styles} Colors={Colors} />
          ))}

          {ex.sets.length === 0 && (
            <TouchableOpacity style={styles.addFirstSet} onPress={() => onAddSet(ex.id, false, false)}>
              <Text style={styles.addFirstSetText}>+ Ersten Satz hinzufügen</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

export default function WorkoutScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [showAddEx, setShowAddEx] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExType, setNewExType] = useState<'strength' | 'cardio'>('strength');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingExId, setRenamingExId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [linkingExId, setLinkingExId] = useState<string | null>(null);

  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);

  const [prBanner, setPrBanner] = useState<{ name: string; weight: number; prev: number } | null>(null);
  const prTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestsRef = useRef<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadBests();
    }, [id])
  );

  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds <= 0) {
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
      setRestSeconds(null);
      return;
    }
    const t = setTimeout(() => setRestSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [restSeconds]);

  async function loadData() {
    if (!id) return;
    const allSessions = await db.sessions.getByProgram('');
    const allSessionsFlat = await (async () => {
      const programs = await db.programs.getAll();
      const results: WorkoutSession[] = [];
      for (const p of programs) {
        const ss = await db.sessions.getByProgram(p.id);
        results.push(...ss);
      }
      return results;
    })();
    const s = allSessionsFlat.find(x => x.id === id);
    if (s) {
      if (!s.started_at) {
        const startedAt = new Date().toISOString();
        await db.sessions.setStartedAt(s.id, startedAt);
        s.started_at = startedAt;
      }
      setSession(s);
    }

    const exList = await db.exercises.getBySession(id);
    const exWithSets: ExerciseWithSets[] = await Promise.all(
      exList.map(async ex => ({
        ...ex,
        sets: await db.sets.getByExercise(ex.id),
      }))
    );
    setExercises(exWithSets);
  }

  async function loadBests() {
    if (!id) return;
    const programs = await db.programs.getAll();
    const bests: Record<string, number> = {};
    for (const p of programs) {
      const sessions = await db.sessions.getByProgram(p.id);
      for (const s of sessions) {
        if (s.id === id) continue;
        const exs = await db.exercises.getBySession(s.id);
        for (const ex of exs) {
          const sets = await db.sets.getByExercise(ex.id);
          for (const set of sets) {
            if (set.is_warmup || set.weight === null) continue;
            const key = ex.name.trim().toLowerCase();
            if (!bests[key] || set.weight > bests[key]) bests[key] = set.weight;
          }
        }
      }
    }
    bestsRef.current = bests;
  }

  async function searchExercises(query: string) {
    setNewExName(query);
    if (newExType === 'cardio' || query.trim().length < 2) { setSuggestions([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(query)}&language=english&format=json`
      );
      const data = await res.json();
      const names: string[] = (data.suggestions ?? []).map((s: { value: string }) => s.value);
      setSuggestions(names.slice(0, 8));
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function addExercise() {
    const name = newExName.trim();
    if (!name || !id) return;
    const ex = await db.exercises.create(id, name, exercises.length, newExType);
    setExercises(prev => [...prev, { ...ex, sets: [] }]);
    setNewExName('');
    setNewExType('strength');
    setShowAddEx(false);
  }

  function saveCardioNote(exerciseId: string, note: string) {
    setExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, cardio_note: note || null } : e));
    db.exercises.setCardioNote(exerciseId, note || null);
  }

  async function finishWorkout() {
    if (!session?.started_at) return;
    const minutes = Math.max(1, Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000));
    await db.sessions.setDuration(session.id, minutes);
    setSession(prev => prev ? { ...prev, duration_minutes: minutes } : prev);
    Alert.alert('Workout beendet ✓', `Dauer: ${minutes} min`);
  }

  async function addSet(exerciseId: string, warmup: boolean, bilateral: boolean) {
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    const set = await db.sets.create(exerciseId, {
      order_index: ex.sets.length,
      weight: null,
      reps: null,
      reps_right: null,
      reps_left: null,
      is_bilateral: bilateral,
      is_warmup: warmup,
      note: null,
    });
    setExercises(prev => prev.map(e =>
      e.id === exerciseId ? { ...e, sets: [...e.sets, set] } : e
    ));
  }

  function showPR(name: string, weight: number, prev: number) {
    setPrBanner({ name, weight, prev });
    Vibration.vibrate(150);
    if (prTimeoutRef.current) clearTimeout(prTimeoutRef.current);
    prTimeoutRef.current = setTimeout(() => setPrBanner(null), 3500);
  }

  function updateSet(setId: string, data: Partial<WorkoutSet>) {
    setExercises(prev => prev.map(e => ({
      ...e,
      sets: e.sets.map(s => s.id === setId ? { ...s, ...data } : s),
    })));
    db.sets.update(setId, data);

    if (data.weight !== undefined && data.weight !== null) {
      const ex = exercises.find(e => e.sets.some(s => s.id === setId));
      const set = ex?.sets.find(s => s.id === setId);
      if (ex && set && !set.is_warmup) {
        const key = ex.name.trim().toLowerCase();
        const prevBest = bestsRef.current[key] ?? 0;
        if (data.weight > prevBest) {
          bestsRef.current[key] = data.weight;
          if (prevBest > 0) showPR(ex.name, data.weight, prevBest);
        }
      }
    }
  }

  async function deleteSet(setId: string) {
    await db.sets.delete(setId);
    setExercises(prev => prev.map(e => ({
      ...e,
      sets: e.sets.filter(s => s.id !== setId),
    })));
  }

  async function saveAsTemplate() {
    if (!session) return;
    Alert.alert('Als Template speichern', `"${session.name}" als Template speichern?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Speichern',
        onPress: async () => {
          await db.templates.create(
            session.name,
            exercises.map((ex, i) => ({ name: ex.name, order_index: i }))
          );
          Alert.alert('Gespeichert ✓', 'Template steht beim nächsten Workout zur Verfügung.');
        },
      },
    ]);
  }

  function handleRenameRequest(id: string) {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    setRenamingExId(id);
    setRenameInput(ex.name);
    setShowRenameModal(true);
  }

  async function renameExercise() {
    if (!renamingExId || !renameInput.trim()) return;
    await db.exercises.rename(renamingExId, renameInput.trim());
    setExercises(prev => prev.map(e => e.id === renamingExId ? { ...e, name: renameInput.trim() } : e));
    setShowRenameModal(false);
    setRenamingExId(null);
  }

  async function linkExercises(idA: string, idB: string) {
    const exA = exercises.find(e => e.id === idA);
    const group = exA?.superset_group ?? (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    await db.exercises.setGroup(idA, group);
    await db.exercises.setGroup(idB, group);
    setExercises(prev => prev.map(e => (e.id === idA || e.id === idB) ? { ...e, superset_group: group } : e));
  }

  async function unlinkExercise(exId: string) {
    const ex = exercises.find(e => e.id === exId);
    if (!ex?.superset_group) return;
    const group = ex.superset_group;
    await db.exercises.setGroup(exId, null);
    const remaining = exercises.filter(e => e.superset_group === group && e.id !== exId);
    if (remaining.length === 1) {
      await db.exercises.setGroup(remaining[0].id, null);
    }
    setExercises(prev => prev.map(e => {
      if (e.id === exId) return { ...e, superset_group: null };
      if (remaining.length === 1 && e.id === remaining[0].id) return { ...e, superset_group: null };
      return e;
    }));
  }

  function handleLinkPress(exId: string) {
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    if (ex.superset_group) {
      Alert.alert('Superset lösen?', '', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Lösen', style: 'destructive', onPress: () => unlinkExercise(exId) },
      ]);
      return;
    }
    if (linkingExId === null) {
      setLinkingExId(exId);
      return;
    }
    if (linkingExId === exId) {
      setLinkingExId(null);
      return;
    }
    linkExercises(linkingExId, exId);
    setLinkingExId(null);
  }

  async function deleteExercise(exerciseId: string) {
    Alert.alert('Übung löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          const ex = exercises.find(e => e.id === exerciseId);
          await db.exercises.delete(exerciseId);
          let cleanupId: string | null = null;
          if (ex?.superset_group) {
            const remaining = exercises.filter(e => e.superset_group === ex.superset_group && e.id !== exerciseId);
            if (remaining.length === 1) {
              cleanupId = remaining[0].id;
              await db.exercises.setGroup(cleanupId, null);
            }
          }
          setExercises(prev => prev.filter(e => e.id !== exerciseId).map(e => e.id === cleanupId ? { ...e, superset_group: null } : e));
        },
      },
    ]);
  }

  function startRest(seconds: number) {
    setRestTotal(seconds);
    setRestSeconds(seconds);
  }

  function adjustRest(delta: number) {
    setRestSeconds(s => (s === null ? null : Math.max(0, s + delta)));
    setRestTotal(t => Math.max(t, (restSeconds ?? 0) + delta));
  }

  function skipRest() {
    setRestSeconds(null);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  const groupLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    let n = 0;
    for (const ex of exercises) {
      if (ex.superset_group && !(ex.superset_group in labels)) {
        labels[ex.superset_group] = String.fromCharCode(65 + n);
        n++;
      }
    }
    return labels;
  }, [exercises]);

  const exercisesWithMeta = useMemo(() => {
    const counts: Record<string, number> = {};
    return exercises.map((ex, i) => {
      const next = exercises[i + 1];
      const tight = !!ex.superset_group && next?.superset_group === ex.superset_group;
      if (!ex.superset_group) return { ex, badge: null as string | null, grouped: false, tight };
      counts[ex.superset_group] = (counts[ex.superset_group] ?? 0) + 1;
      return { ex, badge: `${groupLabels[ex.superset_group]}${counts[ex.superset_group]}`, grouped: true, tight };
    });
  }, [exercises, groupLabels]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Zurück</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sessionTitle}>{session?.name ?? ''}</Text>
        <Text style={styles.sessionDate}>
          {session ? formatDate(session.date) : ''}
          {session?.duration_minutes ? ` · ⏱ ${session.duration_minutes} min` : ''}
        </Text>

        {linkingExId && (
          <View style={styles.linkHint}>
            <Text style={styles.linkHintText}>Wähle die zweite Übung für den Superset</Text>
            <TouchableOpacity onPress={() => setLinkingExId(null)}>
              <Text style={styles.linkHintCancel}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        )}

        {exercisesWithMeta.map(({ ex, badge, grouped, tight }) => (
          <ExerciseBlock
            key={ex.id}
            ex={ex}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onDelete={deleteExercise}
            onRenameRequest={handleRenameRequest}
            onStartRest={startRest}
            onLinkPress={handleLinkPress}
            onSaveCardioNote={saveCardioNote}
            isLinking={linkingExId === ex.id}
            badge={badge}
            grouped={grouped}
            tight={tight}
            styles={styles}
            Colors={Colors}
          />
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={() => setShowAddEx(true)}>
          <Text style={styles.addExBtnText}>+ Übung hinzufügen</Text>
        </TouchableOpacity>

        {exercises.length > 0 && (
          <>
            <TouchableOpacity style={styles.finishBtn} onPress={finishWorkout}>
              <Text style={styles.finishBtnText}>✓ Workout beenden</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.templateBtn} onPress={saveAsTemplate}>
              <Text style={styles.templateBtnText}>📋 Als Template speichern</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {prBanner && (
        <View style={styles.prBanner} pointerEvents="none">
          <Text style={styles.prBannerEmoji}>🏆</Text>
          <View>
            <Text style={styles.prBannerTitle}>Neuer PR! {prBanner.name}</Text>
            <Text style={styles.prBannerSub}>{prBanner.weight} kg (vorher {prBanner.prev} kg)</Text>
          </View>
        </View>
      )}

      {restSeconds !== null && (
        <View style={styles.timerBar}>
          <View style={[styles.timerProgress, { width: `${Math.min(100, (restSeconds / restTotal) * 100)}%` }]} />
          <View style={styles.timerContent}>
            <View>
              <Text style={styles.timerLabel}>⏱ Pause</Text>
              <Text style={styles.timerSeconds}>{formatRestTime(restSeconds)}</Text>
            </View>
            <View style={styles.timerBtnRow}>
              <TouchableOpacity onPress={() => adjustRest(-15)} style={styles.timerAdjustBtn}>
                <Text style={styles.timerAdjustText}>-15</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustRest(15)} style={styles.timerAdjustBtn}>
                <Text style={styles.timerAdjustText}>+15</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={skipRest} style={styles.timerSkipBtn}>
                <Text style={styles.timerSkipText}>Überspringen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal visible={showRenameModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Übung umbenennen</Text>
              <TextInput
                style={styles.input}
                value={renameInput}
                onChangeText={setRenameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={renameExercise}
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowRenameModal(false)}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={renameExercise}>
                  <Text style={styles.modalBtnCreateText}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showAddEx} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Übung hinzufügen</Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeToggleBtn, newExType === 'strength' && styles.typeToggleBtnActive]}
                onPress={() => { setNewExType('strength'); }}
              >
                <Text style={[styles.typeToggleText, newExType === 'strength' && styles.typeToggleTextActive]}>🏋️ Kraft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggleBtn, newExType === 'cardio' && styles.typeToggleBtnActive]}
                onPress={() => { setNewExType('cardio'); setSuggestions([]); }}
              >
                <Text style={[styles.typeToggleText, newExType === 'cardio' && styles.typeToggleTextActive]}>🏃 Cardio / Freitext</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={newExType === 'cardio' ? 'z.B. Laufen, Radfahren...' : 'Suchen oder eigenen Namen...'}
                placeholderTextColor={Colors.textMuted}
                value={newExName}
                onChangeText={searchExercises}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addExercise}
              />
              {searchLoading && <ActivityIndicator color={Colors.accent} style={{ marginLeft: 8 }} />}
            </View>
            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionItem}
                    onPress={() => { setNewExName(s); setSuggestions([]); }}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowAddEx(false); setNewExName(''); setNewExType('strength'); setSuggestions([]); }}
              >
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={addExercise}>
                <Text style={styles.modalBtnCreateText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorScheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 100 },
  topRow: { flexDirection: 'row', marginBottom: 8 },
  backBtn: { padding: 4 },
  backText: { color: Colors.accent, fontSize: 17 },
  sessionTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sessionDate: { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  linkHint: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.accent + '22', borderWidth: 1, borderColor: Colors.accent,
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  linkHintText: { color: Colors.accent, fontSize: 13, fontWeight: '500', flex: 1 },
  linkHintCancel: { color: Colors.accent, fontSize: 13, fontWeight: '700', marginLeft: 10 },
  exBlock: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 12,
  },
  exBlockGrouped: { borderLeftWidth: 3, borderLeftColor: Colors.accentWarm },
  exBlockTight: { marginBottom: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  exBlockLinking: { borderWidth: 1.5, borderColor: Colors.accent },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  supersetBadge: { backgroundColor: Colors.accentWarm + '33', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  supersetBadgeText: { color: Colors.accentWarm, fontSize: 11, fontWeight: '700' },
  exName: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  exMenu: { color: Colors.textMuted, fontSize: 16, padding: 4 },
  exOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  exOptionBtn: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  exOptionText: { color: Colors.textSecondary, fontSize: 13 },
  setRow: { marginBottom: 8 },
  warmupBadge: {
    backgroundColor: Colors.warmup, borderRadius: 4, alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4,
  },
  warmupText: { color: Colors.warmupText, fontSize: 11, fontWeight: '500' },
  setInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 8,
    color: Colors.text, fontSize: 15, minWidth: 52, textAlign: 'center',
  },
  setX: { color: Colors.textMuted, fontSize: 16 },
  timerSetBtn: { marginLeft: 4, padding: 6 },
  timerSetBtnText: { fontSize: 16 },
  deleteSetBtn: { marginLeft: 2, padding: 6 },
  deleteSetText: { color: Colors.textMuted, fontSize: 14 },
  noteInput: {
    marginTop: 6, color: Colors.textSecondary, fontSize: 13,
    backgroundColor: Colors.surfaceAlt, borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  addFirstSet: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 8, borderStyle: 'dashed',
    padding: 10, alignItems: 'center',
  },
  addFirstSetText: { color: Colors.textMuted, fontSize: 13 },
  templateBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  templateBtnText: { color: Colors.textMuted, fontSize: 14 },
  finishBtn: {
    backgroundColor: Colors.success + '22', borderWidth: 1, borderColor: Colors.success,
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8,
  },
  finishBtnText: { color: Colors.success, fontSize: 15, fontWeight: '600' },
  cardioIcon: { fontSize: 14 },
  cardioInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 12,
    color: Colors.text, fontSize: 14, minHeight: 70, textAlignVertical: 'top',
  },
  typeToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeToggleBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  typeToggleBtnActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  typeToggleText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  typeToggleTextActive: { color: Colors.accent, fontWeight: '700' },
  addExBtn: {
    borderWidth: 1, borderColor: Colors.accent, borderRadius: 12, borderStyle: 'dashed',
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  addExBtnText: { color: Colors.accent, fontSize: 15, fontWeight: '500' },
  prBanner: {
    position: 'absolute', top: 16, left: 16, right: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#f5c400',
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  prBannerEmoji: { fontSize: 28 },
  prBannerTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  prBannerSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  timerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    overflow: 'hidden',
  },
  timerProgress: { position: 'absolute', top: 0, left: 0, height: 3, backgroundColor: Colors.accent },
  timerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  timerLabel: { color: Colors.textMuted, fontSize: 12 },
  timerSeconds: { color: Colors.text, fontSize: 26, fontWeight: '700' },
  timerBtnRow: { flexDirection: 'row', gap: 8 },
  timerAdjustBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  timerAdjustText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  timerSkipBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  timerSkipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalBtnCreate: { backgroundColor: Colors.accent },
  modalBtnCreateText: { color: '#fff', fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suggestions: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, marginBottom: 12, overflow: 'hidden' },
  suggestionItem: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  suggestionText: { color: Colors.text, fontSize: 14 },
  });
}
