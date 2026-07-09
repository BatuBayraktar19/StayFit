import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useColors, ColorScheme } from '../../lib/theme';
import { db } from '../../lib/storage';
import { Program, WorkoutSession, WorkoutTemplate, PlannedWorkout } from '../../lib/types';
import { schedulePlannedWorkoutNotification, cancelPlannedWorkoutNotification } from '../../lib/notifications';
import { DatePickerModal } from '../../components/DatePickerModal';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMiniCalendar(sessions: WorkoutSession[]) {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    const dateStr = d.toISOString().split('T')[0];
    const hasSession = sessions.some(s => s.date === dateStr);
    const isToday = i === dayOfWeek;
    days.push({ label: DAYS[i], date: dateStr, hasSession, isToday });
  }
  return days;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function ProgramScreen() {
  const Colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [planned, setPlanned] = useState<PlannedWorkout[]>([]);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false); // scratch vs template
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingSession, setRenamingSession] = useState<WorkoutSession | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);
  const [showPlanDatePicker, setShowPlanDatePicker] = useState(false);

  const [sessionName, setSessionName] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [sessionDate, setSessionDate] = useState(todayStr());

  const [planName, setPlanName] = useState('');
  const [planDate, setPlanDate] = useState(todayStr());
  const [planHour, setPlanHour] = useState('08');
  const [planMinute, setPlanMinute] = useState('00');
  const [planTemplateId, setPlanTemplateId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      db.programs.getAll().then(ps => {
        const p = ps.find(x => x.id === id);
        if (p) setProgram(p);
      });
      db.sessions.getByProgram(id!).then(setSessions);
      db.templates.getAll().then(setTemplates);
      db.plannedWorkouts.getByProgram(id!).then(setPlanned);
    }, [id])
  );

  async function createSession() {
    const name = sessionName.trim();
    if (!name || !id) return;
    const session = await db.sessions.create(id, name, sessionDate);
    setSessionName('');
    setSessionDate(todayStr());
    setShowNewModal(false);
    router.push(`/workout/${session.id}`);
  }

  async function createFromTemplate(template: WorkoutTemplate) {
    if (!id) return;
    const session = await db.sessions.create(id, template.name, sessionDate);
    for (const ex of template.exercises) {
      await db.exercises.create(session.id, ex.name, ex.order_index);
    }
    setSessionDate(todayStr());
    setShowTemplateList(false);
    router.push(`/workout/${session.id}`);
  }

  async function createPlan() {
    const name = planName.trim();
    if (!name || !id) return;
    const time = `${planHour.padStart(2, '0')}:${planMinute.padStart(2, '0')}`;
    const notificationId = await schedulePlannedWorkoutNotification(planDate, time, name);
    const plan = await db.plannedWorkouts.create({
      program_id: id, name, date: planDate, time, template_id: planTemplateId, notification_id: notificationId,
    });
    setPlanned(prev => [...prev, plan].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? '').localeCompare(b.time ?? '')));
    setShowPlanModal(false);
    setPlanName(''); setPlanTemplateId(null); setPlanDate(todayStr()); setPlanHour('08'); setPlanMinute('00');
  }

  async function startPlanned(plan: PlannedWorkout) {
    if (!id) return;
    const session = await db.sessions.create(id, plan.name, todayStr());
    if (plan.template_id) {
      const template = templates.find(t => t.id === plan.template_id);
      if (template) {
        for (const ex of template.exercises) {
          await db.exercises.create(session.id, ex.name, ex.order_index);
        }
      }
    }
    await cancelPlannedWorkoutNotification(plan.notification_id);
    await db.plannedWorkouts.delete(plan.id);
    setPlanned(prev => prev.filter(p => p.id !== plan.id));
    router.push(`/workout/${session.id}`);
  }

  function deletePlanned(plan: PlannedWorkout) {
    Alert.alert('Geplantes Training löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await cancelPlannedWorkoutNotification(plan.notification_id);
          await db.plannedWorkouts.delete(plan.id);
          setPlanned(prev => prev.filter(p => p.id !== plan.id));
        },
      },
    ]);
  }

  function formatPlanDate(dateStr: string, time: string | null) {
    return `${formatDate(dateStr)}${time ? ` · ${time}` : ''}`;
  }

  async function renameSession() {
    if (!renamingSession || !renameInput.trim()) return;
    await db.sessions.rename(renamingSession.id, renameInput.trim());
    setSessions(prev => prev.map(s => s.id === renamingSession.id ? { ...s, name: renameInput.trim() } : s));
    setShowRenameModal(false);
    setRenamingSession(null);
  }

  async function deleteSession(sessionId: string, name: string) {
    Alert.alert('Session löschen', `"${name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.sessions.delete(sessionId);
          setSessions(s => s.filter(x => x.id !== sessionId));
        },
      },
    ]);
  }

  const calDays = getMiniCalendar(sessions);
  const totalSessions = sessions.length;
  const thisWeek = sessions.filter(s => calDays.map(d => d.date).includes(s.date)).length;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={sessions}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.topRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>‹ Zurück</Text>
              </TouchableOpacity>
              <View style={styles.topBtns}>
                <TouchableOpacity style={styles.calBtn} onPress={() => router.push(`/calendar/${id}`)}>
                  <Text style={styles.calBtnText}>📅 Kalender</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.calBtn} onPress={() => setShowPlanModal(true)}>
                  <Text style={styles.calBtnText}>🗓️ Planen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setSessionDate(todayStr()); setShowPickModal(true); }}>
                  <Text style={styles.addBtnText}>+ Workout</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.programTitle}>{program?.name ?? ''}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{totalSessions}</Text>
                <Text style={styles.statLbl}>Sessions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{thisWeek}×</Text>
                <Text style={styles.statLbl}>Diese Woche</Text>
              </View>
            </View>

            <View style={styles.calRow}>
              {calDays.map(d => (
                <View key={d.date} style={[styles.calDay, d.hasSession && styles.calDayActive, d.isToday && !d.hasSession && styles.calDayToday]}>
                  <Text style={[styles.calDayLabel, d.hasSession && styles.calDayLabelActive, d.isToday && !d.hasSession && styles.calDayLabelToday]}>
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>

            {planned.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Geplant</Text>
                {planned.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.plannedCard}
                    onPress={() => startPlanned(p)}
                    onLongPress={() => deletePlanned(p)}
                  >
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionName}>{p.name}</Text>
                      <Text style={styles.sessionDate}>{formatPlanDate(p.date, p.time)}</Text>
                    </View>
                    <Text style={styles.plannedStart}>▶ Starten</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>Sessions</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Noch keine Sessions</Text>
            <Text style={styles.emptyHint}>Starte dein erstes Workout!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.sessionCard}
            onPress={() => router.push(`/workout/${item.id}`)}
            onLongPress={() => {
              Alert.alert(item.name, '', [
                { text: 'Umbenennen', onPress: () => { setRenamingSession(item); setRenameInput(item.name); setShowRenameModal(true); } },
                { text: 'Löschen', style: 'destructive', onPress: () => deleteSession(item.id, item.name) },
                { text: 'Abbrechen', style: 'cancel' },
              ]);
            }}
          >
            <View style={styles.sessionLeft}>
              <Text style={styles.sessionName}>{item.name}</Text>
              <Text style={styles.sessionDate}>
                {formatDate(item.date)}{item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* Pick: Neu oder Template */}
      <Modal visible={showPickModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Neues Workout</Text>
            <TouchableOpacity style={styles.pickBtn} onPress={() => { setShowPickModal(false); setShowNewModal(true); }}>
              <Text style={styles.pickBtnTitle}>✏️ Leeres Workout</Text>
              <Text style={styles.pickBtnSub}>Übungen selbst wählen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickBtn} onPress={() => { setShowPickModal(false); setShowTemplateList(true); }}>
              <Text style={styles.pickBtnTitle}>📋 Aus Template</Text>
              <Text style={styles.pickBtnSub}>{templates.length} gespeicherte Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: 4 }]} onPress={() => setShowPickModal(false)}>
              <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Leeres Workout */}
      <Modal visible={showNewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Workout benennen</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Upper, Lower, Push..."
              placeholderTextColor={Colors.textMuted}
              value={sessionName}
              onChangeText={setSessionName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={createSession}
            />
            <TouchableOpacity style={styles.dateRow} onPress={() => { Keyboard.dismiss(); setShowSessionDatePicker(true); }}>
              <Text style={styles.dateRowLabel}>📅 Datum</Text>
              <Text style={styles.dateRowValue}>{formatDate(sessionDate)}</Text>
            </TouchableOpacity>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setShowNewModal(false); setSessionName(''); }}>
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={createSession}>
                <Text style={styles.modalBtnCreateText}>Starten</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Template Liste */}
      <Modal visible={showTemplateList} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Template wählen</Text>
            <TouchableOpacity style={styles.dateRow} onPress={() => { Keyboard.dismiss(); setShowSessionDatePicker(true); }}>
              <Text style={styles.dateRowLabel}>📅 Datum</Text>
              <Text style={styles.dateRowValue}>{formatDate(sessionDate)}</Text>
            </TouchableOpacity>
            {templates.length === 0 ? (
              <Text style={styles.noTemplates}>Noch keine Templates. Speichere ein Workout als Template.</Text>
            ) : (
              templates.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.templateItem}
                  onPress={() => createFromTemplate(t)}
                  onLongPress={() => Alert.alert(t.name, '', [
                    { text: 'Löschen', style: 'destructive', onPress: async () => {
                      await db.templates.delete(t.id);
                      setTemplates(prev => prev.filter(x => x.id !== t.id));
                    }},
                    { text: 'Abbrechen', style: 'cancel' },
                  ])}
                >
                  <Text style={styles.templateName}>{t.name}</Text>
                  <Text style={styles.templateSub}>{t.exercises.length} Übungen · Lang drücken zum Löschen</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: 8 }]} onPress={() => setShowTemplateList(false)}>
              <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Umbenennen Modal */}
      <Modal visible={showRenameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Session umbenennen</Text>
            <TextInput
              style={styles.input}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameSession}
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={renameSession}>
                <Text style={styles.modalBtnCreateText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Training planen */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🗓️ Training planen</Text>
              <TextInput
                style={styles.input}
                placeholder="Name, z.B. Push Day"
                placeholderTextColor={Colors.textMuted}
                value={planName}
                onChangeText={setPlanName}
              />
              <TouchableOpacity style={styles.dateRow} onPress={() => { Keyboard.dismiss(); setShowPlanDatePicker(true); }}>
                <Text style={styles.dateRowLabel}>📅 Datum</Text>
                <Text style={styles.dateRowValue}>{formatDate(planDate)}</Text>
              </TouchableOpacity>
              <View style={styles.timeRow}>
                <Text style={styles.dateRowLabel}>⏰ Uhrzeit</Text>
                <View style={styles.timeInputs}>
                  <TextInput style={styles.timeInput} value={planHour} onChangeText={setPlanHour} keyboardType="number-pad" maxLength={2} />
                  <Text style={styles.timeColon}>:</Text>
                  <TextInput style={styles.timeInput} value={planMinute} onChangeText={setPlanMinute} keyboardType="number-pad" maxLength={2} />
                </View>
              </View>
              {templates.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 6 }]}>Template (optional)</Text>
                  <View style={styles.planTemplateRow}>
                    <TouchableOpacity
                      style={[styles.planTemplateChip, planTemplateId === null && styles.planTemplateChipActive]}
                      onPress={() => setPlanTemplateId(null)}
                    >
                      <Text style={[styles.planTemplateChipText, planTemplateId === null && styles.planTemplateChipTextActive]}>Keins</Text>
                    </TouchableOpacity>
                    {templates.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.planTemplateChip, planTemplateId === t.id && styles.planTemplateChipActive]}
                        onPress={() => setPlanTemplateId(t.id)}
                      >
                        <Text style={[styles.planTemplateChipText, planTemplateId === t.id && styles.planTemplateChipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowPlanModal(false)}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={createPlan}>
                  <Text style={styles.modalBtnCreateText}>Planen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <DatePickerModal
        visible={showSessionDatePicker}
        initialDate={sessionDate}
        maxDate={todayStr()}
        Colors={Colors}
        onConfirm={(d) => { setSessionDate(d); setShowSessionDatePicker(false); }}
        onCancel={() => setShowSessionDatePicker(false)}
      />

      <DatePickerModal
        visible={showPlanDatePicker}
        initialDate={planDate}
        minDate={todayStr()}
        Colors={Colors}
        onConfirm={(d) => { setPlanDate(d); setShowPlanDatePicker(false); }}
        onCancel={() => setShowPlanDatePicker(false)}
      />
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorScheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16, paddingBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { padding: 4 },
  backText: { color: Colors.accent, fontSize: 17 },
  topBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  calBtn: { backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  calBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  programTitle: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '600', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  calRow: { flexDirection: 'row', gap: 5, marginBottom: 20 },
  calDay: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  calDayActive: { backgroundColor: Colors.accent },
  calDayToday: { borderWidth: 1, borderColor: Colors.accent },
  calDayLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  calDayLabelActive: { color: '#fff' },
  calDayLabelToday: { color: Colors.accent },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  sessionCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionLeft: { flex: 1 },
  sessionName: { fontSize: 16, fontWeight: '500', color: Colors.text },
  sessionDate: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  chevron: { fontSize: 22, color: Colors.textMuted },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },
  pickBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 10 },
  pickBtnTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  pickBtnSub: { fontSize: 12, color: Colors.textMuted },
  templateItem: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 8 },
  templateName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  templateSub: { fontSize: 12, color: Colors.textMuted },
  noTemplates: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginVertical: 16, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalBtnCreate: { backgroundColor: Colors.accent },
  modalBtnCreateText: { color: '#fff', fontWeight: '600' },
  plannedCard: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.accentWarm + '55',
  },
  plannedStart: { color: Colors.accentWarm, fontSize: 13, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 10,
  },
  dateRowLabel: { color: Colors.textSecondary, fontSize: 14 },
  dateRowValue: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 10,
  },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: { backgroundColor: Colors.surface, borderRadius: 8, padding: 8, color: Colors.text, fontSize: 15, width: 42, textAlign: 'center' },
  timeColon: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  planTemplateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  planTemplateChip: { backgroundColor: Colors.surfaceAlt, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border },
  planTemplateChipActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  planTemplateChipText: { color: Colors.textSecondary, fontSize: 12 },
  planTemplateChipTextActive: { color: Colors.accent, fontWeight: '600' },
  });
}
