import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { WorkoutSession } from '../../lib/types';

const SCREEN_W = Dimensions.get('window').width;
const DAY_SIZE = Math.floor((SCREEN_W - 32 - 12) / 7);

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTH_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function MonthGrid({
  year, month, sessionDates, programName,
}: {
  year: number; month: number; sessionDates: Set<string>; programName: string;
}) {
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const today = new Date().toISOString().split('T')[0];

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const count = cells.filter(c => c !== null && sessionDates.has(isoDate(year, month, c!))).length;

  return (
    <View style={styles.monthBlock}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{MONTH_FULL[month]} {year}</Text>
        {count > 0 && <Text style={styles.monthCount}>{count}× trainiert</Text>}
      </View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(d => <Text key={d} style={styles.weekdayLabel}>{d}</Text>)}
      </View>
      <View style={styles.dayGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={[styles.dayCell, styles.dayCellEmpty]} />;
          const dateStr = isoDate(year, month, day);
          const hasSession = sessionDates.has(dateStr);
          const isToday = dateStr === today;
          return (
            <View
              key={i}
              style={[
                styles.dayCell,
                hasSession && styles.dayCellActive,
                isToday && !hasSession && styles.dayCellToday,
              ]}
            >
              <Text style={[
                styles.dayNum,
                hasSession && styles.dayNumActive,
                isToday && !hasSession && styles.dayNumToday,
              ]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function YearHeatmap({ year, sessionDates }: { year: number; sessionDates: Set<string> }) {
  const months = Array.from({ length: 12 }, (_, m) => {
    const days = new Date(year, m + 1, 0).getDate();
    const count = Array.from({ length: days }, (_, d) =>
      sessionDates.has(isoDate(year, m, d + 1)) ? 1 : 0
    ).reduce((a, b) => a + b, 0);
    return { month: m, days, count };
  });

  const maxCount = Math.max(...months.map(m => m.count), 1);

  return (
    <View style={styles.heatmapGrid}>
      {months.map(({ month, count }) => {
        const intensity = count / maxCount;
        const bg = intensity > 0.66 ? Colors.accent : intensity > 0.33 ? '#1a3d7a' : intensity > 0 ? '#0d2040' : Colors.surface;
        return (
          <View key={month} style={[styles.heatCell, { backgroundColor: bg }]}>
            <Text style={styles.heatMonth}>{MONTH_NAMES[month]}</Text>
            {count > 0 && <Text style={styles.heatCount}>{count}</Text>}
          </View>
        );
      })}
    </View>
  );
}

export default function CalendarScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [view, setView] = useState<'month' | 'year'>('month');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [programName, setProgramName] = useState('');

  useFocusEffect(
    useCallback(() => {
      db.sessions.getByProgram(programId!).then(setSessions);
      db.programs.getAll().then(ps => {
        const p = ps.find(x => x.id === programId);
        if (p) setProgramName(p.name);
      });
    }, [programId])
  );

  const sessionDates = new Set(sessions.map(s => s.date));
  const totalSessions = sessions.length;
  const thisYear = sessions.filter(s => s.date.startsWith(String(currentYear))).length;

  function prevPeriod() {
    if (view === 'month') {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
      else setCurrentMonth(m => m - 1);
    } else setCurrentYear(y => y - 1);
  }

  function nextPeriod() {
    if (view === 'month') {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
      else setCurrentMonth(m => m + 1);
    } else setCurrentYear(y => y + 1);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{programName}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalSessions}</Text>
          <Text style={styles.statLbl}>Gesamt</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{thisYear}</Text>
          <Text style={styles.statLbl}>{currentYear}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {sessions.length > 0
              ? Math.round(sessions.length / Math.max(1, (new Date().getFullYear() - new Date(sessions[sessions.length - 1]?.date ?? new Date().toISOString()).getFullYear()) * 12 + new Date().getMonth() + 1))
              : 0}×
          </Text>
          <Text style={styles.statLbl}>Ø / Monat</Text>
        </View>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'month' && styles.toggleBtnActive]}
          onPress={() => setView('month')}
        >
          <Text style={[styles.toggleText, view === 'month' && styles.toggleTextActive]}>Monat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'year' && styles.toggleBtnActive]}
          onPress={() => setView('year')}
        >
          <Text style={[styles.toggleText, view === 'year' && styles.toggleTextActive]}>Jahr</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={prevPeriod}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>
          {view === 'month' ? `${MONTH_FULL[currentMonth]} ${currentYear}` : currentYear}
        </Text>
        <TouchableOpacity style={styles.navBtn} onPress={nextPeriod}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {view === 'month' ? (
          <MonthGrid
            year={currentYear}
            month={currentMonth}
            sessionDates={sessionDates}
            programName={programName}
          />
        ) : (
          <YearHeatmap year={currentYear} sessionDates={sessionDates} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  backBtn: { color: Colors.accent, fontSize: 17, width: 60 },
  topTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  viewToggle: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 10, padding: 3, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: Colors.accent },
  toggleText: { color: Colors.textMuted, fontWeight: '500', fontSize: 14 },
  toggleTextActive: { color: '#fff' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  navBtn: { padding: 8 },
  navBtnText: { color: Colors.accent, fontSize: 24, fontWeight: '300' },
  navTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  scroll: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  monthBlock: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  monthCount: { fontSize: 12, color: Colors.accent },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { width: DAY_SIZE, textAlign: 'center', fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 2 },
  dayCellEmpty: { backgroundColor: 'transparent' },
  dayCellActive: { backgroundColor: Colors.accent },
  dayCellToday: { borderWidth: 1.5, borderColor: Colors.accent },
  dayNum: { fontSize: 13, color: Colors.textMuted },
  dayNumActive: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: Colors.accent, fontWeight: '600' },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heatCell: { width: (SCREEN_W - 32 - 24) / 4, height: (SCREEN_W - 32 - 24) / 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  heatMonth: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  heatCount: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
});
