import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { ColorScheme } from '../lib/theme';

const MONTH_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function DatePickerModal({
  visible, initialDate, onConfirm, onCancel, Colors, minDate, maxDate,
}: {
  visible: boolean;
  initialDate: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
  Colors: ColorScheme;
  minDate?: string;
  maxDate?: string;
}) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const init = new Date(initialDate + 'T00:00:00');
  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());
  const [selected, setSelected] = useState(initialDate);

  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.nav}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{MONTH_FULL[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.nav}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(d => <Text key={d} style={styles.weekday}>{d}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const ds = isoDate(year, month, day);
              const disabled = !!((minDate && ds < minDate) || (maxDate && ds > maxDate));
              const isSel = ds === selected;
              return (
                <TouchableOpacity
                  key={i}
                  disabled={disabled}
                  style={[styles.cell, isSel && styles.cellSel]}
                  onPress={() => setSelected(ds)}
                >
                  <Text style={[styles.cellText, isSel && styles.cellTextSel, disabled && styles.cellTextDisabled]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.okBtn} onPress={() => onConfirm(selected)}>
              <Text style={styles.okText}>Übernehmen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(Colors: ColorScheme) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    box: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, width: '100%', maxWidth: 340 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    navBtn: { padding: 8 },
    nav: { color: Colors.accent, fontSize: 22, fontWeight: '300' },
    title: { color: Colors.text, fontSize: 16, fontWeight: '600' },
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 2 },
    cellSel: { backgroundColor: Colors.accent },
    cellText: { fontSize: 13, color: Colors.text },
    cellTextSel: { color: '#fff', fontWeight: '700' },
    cellTextDisabled: { color: Colors.textMuted, opacity: 0.3 },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.surfaceAlt },
    cancelText: { color: Colors.textSecondary, fontWeight: '500' },
    okBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.accent },
    okText: { color: '#fff', fontWeight: '600' },
  });
}
