import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useColors, useTheme, THEMES, ThemeKey, ColorScheme } from '../../lib/theme';
import { db } from '../../lib/storage';
import { Program, WorkoutTemplate } from '../../lib/types';
import { exportBackup, importBackup } from '../../lib/backup';
import { sendTestNotification } from '../../lib/notifications';

export default function HomeScreen() {
  const router = useRouter();
  const Colors = useColors();
  const { themeKey, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [newName, setNewName] = useState('');

  useFocusEffect(useCallback(() => {
    db.programs.getAll().then(setPrograms);
    db.templates.getAll().then(setTemplates);
  }, []));

  async function createProgram() {
    const name = newName.trim();
    if (!name) return;
    await db.programs.create(name);
    setNewName('');
    setShowModal(false);
    db.programs.getAll().then(setPrograms);
  }

  async function deleteProgram(id: string, name: string) {
    Alert.alert('Programm löschen', `"${name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        await db.programs.delete(id);
        setPrograms(p => p.filter(x => x.id !== id));
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={programs}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>StayFit</Text>
            <View style={styles.headerBtns}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowTemplatesModal(true)}>
                <Text style={styles.iconBtnText}>📋</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowBackupModal(true)}>
                <Text style={styles.iconBtnText}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
                <Text style={styles.addBtnText}>+ Programm</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>Noch kein Programm</Text>
            <Text style={styles.emptyHint}>Erstelle dein erstes Training-Programm</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/program/${item.id}`)}
            onLongPress={() => deleteProgram(item.id, item.name)}
          >
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* Neues Programm */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Neues Programm</Text>
              <TextInput
                style={styles.input}
                placeholder="z.B. Upper Lower, PPL..."
                placeholderTextColor={Colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={createProgram}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setShowModal(false); setNewName(''); }}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={createProgram}>
                  <Text style={styles.modalBtnCreateText}>Erstellen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Templates */}
      <Modal visible={showTemplatesModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>📋 Templates</Text>
            {templates.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                  Noch keine Templates.{'\n'}Speichere ein Workout als Template um es hier zu sehen.
                </Text>
              </View>
            ) : (
              <ScrollView bounces={false}>
                {templates.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.backupBtn}
                    onLongPress={() => Alert.alert(t.name, '', [
                      { text: 'Löschen', style: 'destructive', onPress: async () => {
                        await db.templates.delete(t.id);
                        setTemplates(prev => prev.filter(x => x.id !== t.id));
                      }},
                      { text: 'Abbrechen', style: 'cancel' },
                    ])}
                  >
                    <Text style={styles.backupBtnText}>{t.name}</Text>
                    <Text style={styles.backupBtnHint}>
                      {t.exercises.map(e => e.name).join(' · ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: 12 }]} onPress={() => setShowTemplatesModal(false)}>
              <Text style={styles.modalBtnCancelText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Einstellungen */}
      <Modal visible={showBackupModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <ScrollView style={[styles.modalBox, { maxHeight: '88%' }]} contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>
            <Text style={styles.modalTitle}>⚙️ Einstellungen</Text>

            <Text style={styles.sectionLabel}>Design</Text>
            <View style={styles.themeRow}>
              {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, theme]) => {
                const active = themeKey === key;
                return (
                  <TouchableOpacity key={key} style={styles.themeItem} onPress={() => setTheme(key)}>
                    <View style={[styles.themeSwatch, { borderColor: active ? Colors.accent : Colors.border, borderWidth: active ? 2 : 1 }]}>
                      {theme.preview.map((color, i) => (
                        <View key={i} style={{ flex: 1, backgroundColor: color }} />
                      ))}
                    </View>
                    <Text style={[styles.themeLabel, { color: active ? Colors.accent : Colors.textMuted }]}>{theme.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Datensicherung</Text>
            <TouchableOpacity style={styles.backupBtn} onPress={async () => { setShowBackupModal(false); try { await exportBackup(); } catch (e: any) { Alert.alert('Fehler', e?.message ?? 'Export fehlgeschlagen.'); } }}>
              <Text style={styles.backupBtnText}>📤 Backup exportieren</Text>
              <Text style={styles.backupBtnHint}>Alle Daten als JSON teilen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backupBtn} onPress={async () => { setShowBackupModal(false); const r = await importBackup(); Alert.alert(r.success ? 'Erfolg ✓' : 'Fehler', r.message); if (r.success) db.programs.getAll().then(setPrograms); }}>
              <Text style={styles.backupBtnText}>📥 Backup importieren</Text>
              <Text style={styles.backupBtnHint}>JSON-Datei auswählen und laden</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Benachrichtigungen</Text>
            <TouchableOpacity style={styles.backupBtn} onPress={async () => { setShowBackupModal(false); await sendTestNotification(); }}>
              <Text style={styles.backupBtnText}>🔔 Test-Nachricht senden</Text>
              <Text style={styles.backupBtnHint}>Erscheint in ~2 Sekunden</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: 8 }]} onPress={() => setShowBackupModal(false)}>
              <Text style={styles.modalBtnCancelText}>Schließen</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    list: { padding: 16, paddingBottom: 32 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', color: Colors.text },
    headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    iconBtnText: { fontSize: 16 },
    addBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardName: { fontSize: 17, fontWeight: '500', color: Colors.text },
    chevron: { fontSize: 22, color: Colors.textMuted },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 18, fontWeight: '500', color: Colors.text, marginBottom: 6 },
    emptyHint: { fontSize: 14, color: Colors.textMuted },
    sectionLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    themeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    themeItem: { alignItems: 'center', gap: 5 },
    themeSwatch: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexDirection: 'row' },
    themeLabel: { fontSize: 11, fontWeight: '600' },
    backupBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 8 },
    backupBtnText: { color: Colors.text, fontSize: 15, fontWeight: '500', marginBottom: 3 },
    backupBtnHint: { color: Colors.textMuted, fontSize: 12 },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
    input: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, marginBottom: 16 },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
    modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
    modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
    modalBtnCreate: { backgroundColor: Colors.accent },
    modalBtnCreateText: { color: '#fff', fontWeight: '600' },
  });
}
