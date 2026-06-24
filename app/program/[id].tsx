import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { Program, WorkoutSession } from '../../lib/types';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sessionName, setSessionName] = useState('');

  useFocusEffect(
    useCallback(() => {
      db.programs.getAll().then(ps => {
        const p = ps.find(x => x.id === id);
        if (p) setProgram(p);
      });
      db.sessions.getByProgram(id!).then(setSessions);
    }, [id])
  );

  async function createSession() {
    const name = sessionName.trim();
    if (!name || !id) return;
    const today = new Date().toISOString().split('T')[0];
    const session = await db.sessions.create(id, name, today);
    setSessionName('');
    setShowModal(false);
    router.push(`/workout/${session.id}`);
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
  const thisWeekDates = calDays.map(d => d.date);
  const thisWeek = sessions.filter(s => thisWeekDates.includes(s.date)).length;

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
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
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
                <View
                  key={d.date}
                  style={[
                    styles.calDay,
                    d.hasSession && styles.calDayActive,
                    d.isToday && !d.hasSession && styles.calDayToday,
                  ]}
                >
                  <Text style={[
                    styles.calDayLabel,
                    d.hasSession && styles.calDayLabelActive,
                    d.isToday && !d.hasSession && styles.calDayLabelToday,
                  ]}>{d.label}</Text>
                </View>
              ))}
            </View>

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
            onLongPress={() => deleteSession(item.id, item.name)}
          >
            <View style={styles.sessionLeft}>
              <Text style={styles.sessionName}>{item.name}</Text>
              <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Neues Workout</Text>
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
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowModal(false); setSessionName(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={createSession}>
                <Text style={styles.modalBtnCreateText}>Starten</Text>
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
  statBox: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  statNum: { fontSize: 24, fontWeight: '600', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  calRow: { flexDirection: 'row', gap: 5, marginBottom: 20 },
  calDay: {
    flex: 1, aspectRatio: 1, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  calDayActive: { backgroundColor: Colors.accent },
  calDayToday: { borderWidth: 1, borderColor: Colors.accent },
  calDayLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  calDayLabelActive: { color: '#fff' },
  calDayLabelToday: { color: Colors.accent },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  sessionCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sessionLeft: { flex: 1 },
  sessionName: { fontSize: 16, fontWeight: '500', color: Colors.text },
  sessionDate: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  chevron: { fontSize: 22, color: Colors.textMuted },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },
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
});
