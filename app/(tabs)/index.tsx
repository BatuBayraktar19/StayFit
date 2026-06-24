import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { Program } from '../../lib/types';
import { exportBackup, importBackup } from '../../lib/backup';

export default function HomeScreen() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newName, setNewName] = useState('');

  useFocusEffect(
    useCallback(() => {
      db.programs.getAll().then(setPrograms);
    }, [])
  );

  async function createProgram() {
    const name = newName.trim();
    if (!name) return;
    await db.programs.create(name);
    setNewName('');
    setShowModal(false);
    const updated = await db.programs.getAll();
    setPrograms(updated);
  }

  async function deleteProgram(id: string, name: string) {
    Alert.alert('Programm löschen', `"${name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.programs.delete(id);
          setPrograms(p => p.filter(x => x.id !== id));
        },
      },
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
            <View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardSub}>Lang drücken zum Löschen</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
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
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowModal(false); setNewName(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCreate]}
                onPress={createProgram}
              >
                <Text style={styles.modalBtnCreateText}>Erstellen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showBackupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚙️ Einstellungen</Text>
            <Text style={styles.backupSection}>Datensicherung</Text>
            <TouchableOpacity
              style={styles.backupBtn}
              onPress={async () => {
                setShowBackupModal(false);
                try { await exportBackup(); } catch { Alert.alert('Fehler', 'Export fehlgeschlagen.'); }
              }}
            >
              <Text style={styles.backupBtnText}>📤 Backup exportieren</Text>
              <Text style={styles.backupBtnHint}>Alle Daten als JSON teilen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backupBtn}
              onPress={async () => {
                setShowBackupModal(false);
                const result = await importBackup();
                Alert.alert(result.success ? 'Erfolg ✓' : 'Fehler', result.message);
                if (result.success) db.programs.getAll().then(setPrograms);
              }}
            >
              <Text style={styles.backupBtnText}>📥 Backup importieren</Text>
              <Text style={styles.backupBtnHint}>JSON-Datei auswählen und laden</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: 8 }]}
              onPress={() => setShowBackupModal(false)}
            >
              <Text style={styles.modalBtnCancelText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  iconBtnText: { fontSize: 16 },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  backupSection: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  backupBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 8 },
  backupBtnText: { color: Colors.text, fontSize: 15, fontWeight: '500', marginBottom: 3 },
  backupBtnHint: { color: Colors.textMuted, fontSize: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: { fontSize: 17, fontWeight: '500', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  chevron: { fontSize: 22, color: Colors.textMuted },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalBtnCreate: { backgroundColor: Colors.accent },
  modalBtnCreateText: { color: '#fff', fontWeight: '600' },
});
