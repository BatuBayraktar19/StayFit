import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useColors, ColorScheme } from '../../lib/theme';
import { db } from '../../lib/storage';
import { FoodEntry, NutritionGoal } from '../../lib/types';

function dateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatDateLabel(d: string) {
  const date = new Date(d + 'T00:00:00');
  const today = dateStr(new Date());
  const yesterday = dateStr(new Date(Date.now() - 86400000));
  if (d === today) return 'Heute';
  if (d === yesterday) return 'Gestern';
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function MacroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const Colors = useColors();
  if (!value) return null;
  return (
    <View style={{ borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', backgroundColor: color + '22', borderColor: color + '55' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color }}>{Math.round(value)}g</Text>
      <Text style={{ fontSize: 10, color: Colors.textMuted }}>{label}</Text>
    </View>
  );
}

export default function NutritionScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [viewDate, setViewDate] = useState(dateStr(new Date()));
  const [tab, setTab] = useState<'tag' | 'history'>('tag');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [allEntries, setAllEntries] = useState<FoodEntry[]>([]);
  const [goal, setGoal] = useState<NutritionGoal>({ calories: 2000, protein: null });
  const [showAdd, setShowAdd] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [goalCalInput, setGoalCalInput] = useState('');
  const [goalProtInput, setGoalProtInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
      db.nutritionGoal.get().then(g => {
        setGoal(g);
        setGoalCalInput(String(g.calories));
        setGoalProtInput(g.protein !== null ? String(g.protein) : '');
      });
    }, [viewDate])
  );

  async function loadData() {
    const [day, all] = await Promise.all([db.food.getByDate(viewDate), db.food.getAll()]);
    setEntries(day);
    setAllEntries(all);
  }

  function changeDate(delta: number) {
    const d = new Date(viewDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = dateStr(d);
    if (next <= dateStr(new Date())) setViewDate(next);
  }

  const totalCal = entries.reduce((s, e) => s + e.calories, 0);
  const totalProt = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);
  const calProgress = Math.min(totalCal / goal.calories, 1);
  const remaining = goal.calories - totalCal;

  // Group history by date
  const historyDates = [...new Set(allEntries.map(e => e.date))].sort((a, b) => b.localeCompare(a));

  async function addEntry() {
    const cal = parseInt(calories);
    if (!name.trim() || !cal || isNaN(cal)) return;
    const entry = await db.food.add({
      date: viewDate,
      name: name.trim(),
      calories: cal,
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
    });
    setEntries(prev => [...prev, entry]);
    setAllEntries(prev => [...prev, entry]);
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setShowAdd(false);
  }

  async function deleteEntry(id: string) {
    Alert.alert('Löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.food.delete(id);
          setEntries(prev => prev.filter(e => e.id !== id));
          setAllEntries(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  }

  async function saveGoal() {
    const cal = parseInt(goalCalInput);
    if (!cal || isNaN(cal)) return;
    const newGoal: NutritionGoal = { calories: cal, protein: goalProtInput ? parseFloat(goalProtInput) : null };
    await db.nutritionGoal.set(newGoal);
    setGoal(newGoal);
    setShowGoalModal(false);
  }

  const isToday = viewDate === dateStr(new Date());

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Kalorien</Text>
        <TouchableOpacity onPress={() => setShowGoalModal(true)}>
          <Text style={styles.goalBtnText}>⚙️ Ziel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'tag' && styles.tabBtnActive]} onPress={() => setTab('tag')}>
          <Text style={[styles.tabBtnText, tab === 'tag' && styles.tabBtnTextActive]}>Heute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>Verlauf</Text>
        </TouchableOpacity>
      </View>

      {tab === 'tag' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Datums-Navigator */}
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavBtn}>
              <Text style={styles.dateNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.dateNavLabel}>{formatDateLabel(viewDate)}</Text>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavBtn} disabled={isToday}>
              <Text style={[styles.dateNavArrow, isToday && { opacity: 0.2 }]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.calRow}>
              <View>
                <Text style={styles.calNum}>{totalCal}</Text>
                <Text style={styles.calLabel}>kcal</Text>
              </View>
              <View style={styles.calSide}>
                <Text style={[styles.remainNum, { color: remaining < 0 ? Colors.danger : Colors.accent }]}>
                  {remaining >= 0 ? remaining : Math.abs(remaining)}
                </Text>
                <Text style={styles.remainLabel}>{remaining >= 0 ? 'verbleibend' : 'überschritten'}</Text>
              </View>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width: `${calProgress * 100}%` as any,
                backgroundColor: calProgress > 1 ? Colors.danger : Colors.accent,
              }]} />
            </View>
            <Text style={styles.goalLabel}>Ziel: {goal.calories} kcal</Text>
            <View style={styles.macroRow}>
              <MacroBadge label="Protein" value={totalProt} color="#5ac45a" />
              <MacroBadge label="Kohlenh." value={totalCarbs} color="#f5c400" />
              <MacroBadge label="Fett" value={totalFat} color="#f57c00" />
            </View>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Mahlzeit hinzufügen</Text>
          </TouchableOpacity>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>Nichts eingetragen</Text>
            </View>
          ) : (
            entries.map(e => (
              <TouchableOpacity key={e.id} style={styles.entryCard} onLongPress={() => deleteEntry(e.id)}>
                <View style={styles.entryLeft}>
                  <Text style={styles.entryName}>{e.name}</Text>
                  <View style={styles.entryMacros}>
                    {e.protein !== null && <Text style={styles.entryMacro}>P: {e.protein}g</Text>}
                    {e.carbs !== null && <Text style={styles.entryMacro}>K: {e.carbs}g</Text>}
                    {e.fat !== null && <Text style={styles.entryMacro}>F: {e.fat}g</Text>}
                  </View>
                </View>
                <Text style={styles.entryCal}>{e.calories} kcal</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={historyDates}
          keyExtractor={d => d}
          contentContainerStyle={styles.scroll}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>Noch kein Verlauf</Text>
            </View>
          }
          renderItem={({ item: date }) => {
            const dayEntries = allEntries.filter(e => e.date === date);
            const dayCal = dayEntries.reduce((s, e) => s + e.calories, 0);
            const dayProt = dayEntries.reduce((s, e) => s + (e.protein ?? 0), 0);
            return (
              <View style={styles.historyDay}>
                <View style={styles.historyDayHeader}>
                  <Text style={styles.historyDayLabel}>{formatDateLabel(date)}</Text>
                  <View style={styles.historyDayRight}>
                    <Text style={styles.historyDayCal}>{dayCal} kcal</Text>
                    {dayProt > 0 && <Text style={styles.historyDayProt}>{Math.round(dayProt)}g P</Text>}
                  </View>
                </View>
                {dayEntries.map(e => (
                  <View key={e.id} style={styles.historyEntry}>
                    <Text style={styles.historyEntryName}>{e.name}</Text>
                    <Text style={styles.historyEntryCal}>{e.calories}</Text>
                  </View>
                ))}
              </View>
            );
          }}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.modalBox} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Mahlzeit — {formatDateLabel(viewDate)}</Text>
              <TextInput style={styles.input} placeholder="Name (z.B. Haferflocken)" placeholderTextColor={Colors.textMuted}
                value={name} onChangeText={setName} autoFocus />
              <TextInput style={styles.input} placeholder="Kalorien (kcal) *" placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad" value={calories} onChangeText={setCalories} />
              <View style={styles.macroInputRow}>
                <TextInput style={[styles.input, styles.macroInput]} placeholder="Protein g" placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
                <TextInput style={[styles.input, styles.macroInput]} placeholder="Kohlenh. g" placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
                <TextInput style={[styles.input, styles.macroInput]} placeholder="Fett g" placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => { setShowAdd(false); setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); }}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={addEntry}>
                  <Text style={styles.modalBtnCreateText}>Hinzufügen</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Tagesziel</Text>
              <TextInput style={styles.input} placeholder="Kalorienziel (kcal)" placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad" value={goalCalInput} onChangeText={setGoalCalInput} autoFocus />
              <TextInput style={styles.input} placeholder="Proteinziel g (optional)" placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad" value={goalProtInput} onChangeText={setGoalProtInput} />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowGoalModal(false)}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={saveGoal}>
                  <Text style={styles.modalBtnCreateText}>Speichern</Text>
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
  scroll: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  goalBtnText: { color: Colors.textSecondary, fontSize: 14 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, backgroundColor: Colors.surface, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.accent },
  tabBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabBtnTextActive: { color: '#fff' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateNavBtn: { padding: 8 },
  dateNavArrow: { fontSize: 26, color: Colors.accent },
  dateNavLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  calNum: { fontSize: 40, fontWeight: '700', color: Colors.text, lineHeight: 44 },
  calLabel: { fontSize: 12, color: Colors.textMuted },
  calSide: { alignItems: 'flex-end' },
  remainNum: { fontSize: 22, fontWeight: '600' },
  remainLabel: { fontSize: 11, color: Colors.textMuted },
  progressBg: { height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: 8, borderRadius: 4 },
  goalLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 12 },
  macroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  macroBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  macroBadgeVal: { fontSize: 14, fontWeight: '700' },
  macroBadgeLbl: { fontSize: 10, color: Colors.textMuted },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary },
  entryCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryLeft: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  entryMacros: { flexDirection: 'row', gap: 8 },
  entryMacro: { fontSize: 11, color: Colors.textMuted },
  entryCal: { fontSize: 16, fontWeight: '700', color: Colors.text },
  historyDay: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 12 },
  historyDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyDayLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  historyDayRight: { alignItems: 'flex-end' },
  historyDayCal: { fontSize: 15, fontWeight: '700', color: Colors.accent },
  historyDayProt: { fontSize: 11, color: '#5ac45a', marginTop: 2 },
  historyEntry: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: Colors.border },
  historyEntryName: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  historyEntryCal: { fontSize: 13, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, marginBottom: 10 },
  macroInputRow: { flexDirection: 'row', gap: 8 },
  macroInput: { flex: 1, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalBtnCreate: { backgroundColor: Colors.accent },
  modalBtnCreateText: { color: '#fff', fontWeight: '600' },
  });
}
