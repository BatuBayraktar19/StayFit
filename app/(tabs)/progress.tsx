import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, Alert, TextInput, Modal, FlatList,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { BodyWeightEntry, ProgressPhoto } from '../../lib/types';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_W - 48) / 3;

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function ProgressScreen() {
  const [tab, setTab] = useState<'fotos' | 'gewicht'>('fotos');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightNote, setWeightNote] = useState('');

  useFocusEffect(
    useCallback(() => {
      db.photos.getAll().then(setPhotos);
      db.bodyweight.getAll().then(setWeights);
    }, [])
  );

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Kein Zugriff', 'StayFit braucht Zugriff auf deine Fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const today = new Date().toISOString().split('T')[0];
      const photo = await db.photos.add(result.assets[0].uri, today);
      setPhotos(prev => [photo, ...prev]);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Kein Zugriff', 'StayFit braucht Kamera-Zugriff.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const today = new Date().toISOString().split('T')[0];
      const photo = await db.photos.add(result.assets[0].uri, today);
      setPhotos(prev => [photo, ...prev]);
    }
  }

  async function deletePhoto(id: string) {
    Alert.alert('Foto löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.photos.delete(id);
          setPhotos(prev => prev.filter(p => p.id !== id));
        },
      },
    ]);
  }

  async function addWeight() {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (!w || isNaN(w)) return;
    const today = new Date().toISOString().split('T')[0];
    const entry = await db.bodyweight.add(w, today, weightNote || undefined);
    setWeights(prev => [entry, ...prev]);
    setWeightInput('');
    setWeightNote('');
    setShowWeightModal(false);
  }

  const latestWeight = weights[0]?.weight;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Fortschritt</Text>
        {latestWeight && (
          <View style={styles.weightBadge}>
            <Text style={styles.weightBadgeText}>{latestWeight} kg</Text>
          </View>
        )}
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'fotos' && styles.tabBtnActive]}
          onPress={() => setTab('fotos')}
        >
          <Text style={[styles.tabBtnText, tab === 'fotos' && styles.tabBtnTextActive]}>
            📸 Fotos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'gewicht' && styles.tabBtnActive]}
          onPress={() => setTab('gewicht')}
        >
          <Text style={[styles.tabBtnText, tab === 'gewicht' && styles.tabBtnTextActive]}>
            ⚖️ Gewicht
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'fotos' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
              <Text style={styles.photoActionText}>📷 Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionBtn} onPress={pickPhoto}>
              <Text style={styles.photoActionText}>🖼️ Galerie</Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📸</Text>
              <Text style={styles.emptyText}>Noch keine Fortschrittsfotos</Text>
              <Text style={styles.emptyHint}>Füge dein erstes Foto hinzu</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onLongPress={() => deletePhoto(p.id)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                  <Text style={styles.photoDate}>{formatDate(p.date)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            style={styles.addWeightBtn}
            onPress={() => setShowWeightModal(true)}
          >
            <Text style={styles.addWeightBtnText}>+ Gewicht eintragen</Text>
          </TouchableOpacity>

          {weights.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚖️</Text>
              <Text style={styles.emptyText}>Noch kein Gewicht eingetragen</Text>
            </View>
          ) : (
            <>
              <View style={styles.weightChart}>
                {(() => {
                  const sorted = [...weights].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  const max = Math.max(...sorted.map(w => w.weight));
                  const min = Math.min(...sorted.map(w => w.weight));
                  const range = max - min || 1;
                  const chartH = 100;
                  const chartW = SCREEN_W - 64;
                  const step = sorted.length > 1 ? chartW / (sorted.length - 1) : 0;
                  return sorted.map((w, i) => {
                    const x = i * step;
                    const y = chartH - ((w.weight - min) / range) * chartH;
                    return (
                      <View
                        key={w.id}
                        style={[styles.chartDot, { left: x - 4, top: y - 4 }]}
                      />
                    );
                  });
                })()}
              </View>

              {weights.map(w => (
                <View key={w.id} style={styles.weightRow}>
                  <View>
                    <Text style={styles.weightVal}>{w.weight} kg</Text>
                    {w.note && <Text style={styles.weightNote}>{w.note}</Text>}
                  </View>
                  <Text style={styles.weightDate}>{formatDate(w.date)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Gewicht eintragen</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. 82.5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Notiz (optional)"
              placeholderTextColor={Colors.textMuted}
              value={weightNote}
              onChangeText={setWeightNote}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowWeightModal(false); setWeightInput(''); setWeightNote(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={addWeight}>
                <Text style={styles.modalBtnCreateText}>Speichern</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  weightBadge: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  weightBadgeText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.accent },
  tabBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabBtnTextActive: { color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  photoActionBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 14, alignItems: 'center' },
  photoActionText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: Colors.surface },
  photoDate: { fontSize: 10, color: Colors.textMuted, marginTop: 3, textAlign: 'center', width: PHOTO_SIZE },
  addWeightBtn: { backgroundColor: Colors.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  addWeightBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  weightChart: { height: 120, backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, position: 'relative', overflow: 'hidden' },
  chartDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
  weightVal: { fontSize: 17, fontWeight: '600', color: Colors.text },
  weightNote: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  weightDate: { fontSize: 13, color: Colors.textMuted },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalBtnCreate: { backgroundColor: Colors.accent },
  modalBtnCreateText: { color: '#fff', fontWeight: '600' },
});
