import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { Exercise, WorkoutSet, WorkoutSession } from '../../lib/types';

type ExerciseWithSets = Exercise & { sets: WorkoutSet[] };

function SetRow({
  set,
  onUpdate,
  onDelete,
}: {
  set: WorkoutSet;
  onUpdate: (id: string, data: Partial<WorkoutSet>) => void;
  onDelete: (id: string) => void;
}) {
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
          value={set.weight !== null ? String(set.weight) : ''}
          onChangeText={v => onUpdate(set.id, { weight: v ? parseFloat(v) : null })}
        />
        <Text style={styles.setX}>×</Text>
        {isBilateral ? (
          <>
            <TextInput
              style={styles.setInput}
              placeholder="R"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={set.reps_right !== null ? String(set.reps_right) : ''}
              onChangeText={v => onUpdate(set.id, { reps_right: v ? parseFloat(v) : null })}
            />
            <Text style={styles.setX}>/</Text>
            <TextInput
              style={styles.setInput}
              placeholder="L"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={set.reps_left !== null ? String(set.reps_left) : ''}
              onChangeText={v => onUpdate(set.id, { reps_left: v ? parseFloat(v) : null })}
            />
          </>
        ) : (
          <TextInput
            style={styles.setInput}
            placeholder="reps"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={set.reps !== null ? String(set.reps) : ''}
            onChangeText={v => onUpdate(set.id, { reps: v ? parseFloat(v) : null })}
          />
        )}
        <TouchableOpacity onPress={() => onDelete(set.id)} style={styles.deleteSetBtn}>
          <Text style={styles.deleteSetText}>✕</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="// Notiz (optional)"
        placeholderTextColor={Colors.textMuted}
        value={set.note ?? ''}
        onChangeText={v => onUpdate(set.id, { note: v || null })}
      />
    </View>
  );
}

function ExerciseBlock({
  ex,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDelete,
}: {
  ex: ExerciseWithSets;
  onAddSet: (exerciseId: string, warmup: boolean, bilateral: boolean) => void;
  onUpdateSet: (id: string, data: Partial<WorkoutSet>) => void;
  onDeleteSet: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <View style={styles.exBlock}>
      <View style={styles.exHeader}>
        <Text style={styles.exName}>{ex.name}</Text>
        <TouchableOpacity onPress={() => setShowOptions(v => !v)}>
          <Text style={styles.exMenu}>•••</Text>
        </TouchableOpacity>
      </View>

      {showOptions && (
        <View style={styles.exOptions}>
          <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onAddSet(ex.id, false, false); setShowOptions(false); }}>
            <Text style={styles.exOptionText}>+ Satz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onAddSet(ex.id, true, false); setShowOptions(false); }}>
            <Text style={styles.exOptionText}>+ Warmup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exOptionBtn} onPress={() => { onAddSet(ex.id, false, true); setShowOptions(false); }}>
            <Text style={styles.exOptionText}>+ L/R Satz</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exOptionBtn, { borderColor: Colors.danger }]} onPress={() => onDelete(ex.id)}>
            <Text style={[styles.exOptionText, { color: Colors.danger }]}>Übung löschen</Text>
          </TouchableOpacity>
        </View>
      )}

      {ex.sets.map(set => (
        <SetRow key={set.id} set={set} onUpdate={onUpdateSet} onDelete={onDeleteSet} />
      ))}

      {ex.sets.length === 0 && (
        <TouchableOpacity style={styles.addFirstSet} onPress={() => onAddSet(ex.id, false, false)}>
          <Text style={styles.addFirstSetText}>+ Ersten Satz hinzufügen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [showAddEx, setShowAddEx] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

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
    if (s) setSession(s);

    const exList = await db.exercises.getBySession(id);
    const exWithSets: ExerciseWithSets[] = await Promise.all(
      exList.map(async ex => ({
        ...ex,
        sets: await db.sets.getByExercise(ex.id),
      }))
    );
    setExercises(exWithSets);
  }

  async function searchExercises(query: string) {
    setNewExName(query);
    if (query.trim().length < 2) { setSuggestions([]); return; }
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
    const ex = await db.exercises.create(id, name, exercises.length);
    setExercises(prev => [...prev, { ...ex, sets: [] }]);
    setNewExName('');
    setShowAddEx(false);
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

  async function updateSet(setId: string, data: Partial<WorkoutSet>) {
    await db.sets.update(setId, data);
    setExercises(prev => prev.map(e => ({
      ...e,
      sets: e.sets.map(s => s.id === setId ? { ...s, ...data } : s),
    })));
  }

  async function deleteSet(setId: string) {
    await db.sets.delete(setId);
    setExercises(prev => prev.map(e => ({
      ...e,
      sets: e.sets.filter(s => s.id !== setId),
    })));
  }

  async function deleteExercise(exerciseId: string) {
    Alert.alert('Übung löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.exercises.delete(exerciseId);
          setExercises(prev => prev.filter(e => e.id !== exerciseId));
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

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
        <Text style={styles.sessionDate}>{session ? formatDate(session.date) : ''}</Text>

        {exercises.map(ex => (
          <ExerciseBlock
            key={ex.id}
            ex={ex}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onDelete={deleteExercise}
          />
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={() => setShowAddEx(true)}>
          <Text style={styles.addExBtnText}>+ Übung hinzufügen</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showAddEx} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Übung hinzufügen</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Suchen oder eigenen Namen..."
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
                onPress={() => { setShowAddEx(false); setNewExName(''); setSuggestions([]); }}
              >
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={addExercise}>
                <Text style={styles.modalBtnCreateText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 60 },
  topRow: { flexDirection: 'row', marginBottom: 8 },
  backBtn: { padding: 4 },
  backText: { color: Colors.accent, fontSize: 17 },
  sessionTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sessionDate: { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  exBlock: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 12,
  },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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
  deleteSetBtn: { marginLeft: 4, padding: 6 },
  deleteSetText: { color: Colors.textMuted, fontSize: 14 },
  noteInput: {
    marginTop: 4, color: Colors.textMuted, fontSize: 12,
    paddingVertical: 4, paddingHorizontal: 2,
  },
  addFirstSet: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 8, borderStyle: 'dashed',
    padding: 10, alignItems: 'center',
  },
  addFirstSetText: { color: Colors.textMuted, fontSize: 13 },
  addExBtn: {
    borderWidth: 1, borderColor: Colors.accent, borderRadius: 12, borderStyle: 'dashed',
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  addExBtnText: { color: Colors.accent, fontSize: 15, fontWeight: '500' },
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
