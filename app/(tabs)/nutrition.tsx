import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { FoodEntry, NutritionGoal } from '../../lib/types';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function MacroBadge({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value === null) return null;
  return (
    <View style={[styles.macroBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.macroBadgeVal, { color }]}>{value}g</Text>
      <Text style={styles.macroBadgeLbl}>{label}</Text>
    </View>
  );
}

export default function NutritionScreen() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
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
      const today = todayStr();
      db.food.getByDate(today).then(setEntries);
      db.nutritionGoal.get().then(g => {
        setGoal(g);
        setGoalCalInput(String(g.calories));
        setGoalProtInput(g.protein !== null ? String(g.protein) : '');
      });
    }, [])
  );

  const totalCal = entries.reduce((s, e) => s + e.calories, 0);
  const totalProt = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);
  const calProgress = Math.min(totalCal / goal.calories, 1);
  const remaining = goal.calories - totalCal;

  async function addEntry() {
    const cal = parseInt(calories);
    if (!name.trim() || !cal || isNaN(cal)) return;
    const entry = await db.food.add({
      date: todayStr(),
      name: name.trim(),
      calories: cal,
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
    });
    setEntries(prev => [...prev, entry]);
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setShowAdd(false);
  }

  async function deleteEntry(id: string) {
    Alert.alert('Eintrag löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.food.delete(id);
          setEntries(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  }

  async function saveGoal() {
    const cal = parseInt(goalCalInput);
    if (!cal || isNaN(cal)) return;
    const newGoal: NutritionGoal = {
      calories: cal,
      protein: goalProtInput ? parseFloat(goalProtInput) : null,
    };
    await db.nutritionGoal.set(newGoal);
    setGoal(newGoal);
    setShowGoalModal(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Kalorien</Text>
          <TouchableOpacity onPress={() => setShowGoalModal(true)}>
            <Text style={styles.goalBtnText}>⚙️ Ziel</Text>
          </TouchableOpacity>
        </View>

        {/* Ring / Fortschritt */}
        <View style={styles.summaryCard}>
          <View style={styles.calRow}>
            <View style={styles.calMain}>
              <Text style={styles.calNum}>{totalCal}</Text>
              <Text style={styles.calLabel}>kcal heute</Text>
            </View>
            <View style={styles.calSide}>
              <Text style={styles.remainNum}>{remaining > 0 ? remaining : 0}</Text>
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
            <MacroBadge label="Protein" value={totalProt > 0 ? totalProt : null} color="#5ac45a" />
            <MacroBadge label="Kohlenh." value={totalCarbs > 0 ? totalCarbs : null} color="#f5c400" />
            <MacroBadge label="Fett" value={totalFat > 0 ? totalFat : null} color="#f57c00" />
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Mahlzeit hinzufügen</Text>
        </TouchableOpacity>

        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>Noch nichts gegessen?</Text>
            <Text style={styles.emptyHint}>Trag deine erste Mahlzeit ein</Text>
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

      {/* Mahlzeit hinzufügen Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalBox} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Mahlzeit hinzufügen</Text>
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
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ziel Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Tagesziel festlegen</Text>
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  goalBtnText: { color: Colors.textSecondary, fontSize: 14 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  calMain: {},
  calNum: { fontSize: 40, fontWeight: '700', color: Colors.text, lineHeight: 44 },
  calLabel: { fontSize: 12, color: Colors.textMuted },
  calSide: { alignItems: 'flex-end' },
  remainNum: { fontSize: 22, fontWeight: '600', color: Colors.accent },
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
  emptyText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },
  entryCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryLeft: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  entryMacros: { flexDirection: 'row', gap: 8 },
  entryMacro: { fontSize: 11, color: Colors.textMuted },
  entryCal: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
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
