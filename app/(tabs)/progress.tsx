import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, TextInput, Modal, FlatList,
  Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { BodyWeightEntry, ProgressPhoto } from '../../lib/types';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_W - 48) / 3;
const CHART_W = SCREEN_W - 48;
const CHART_H = 140;
const PAD = { left: 36, right: 12, top: 12, bottom: 28 };

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short',
  });
}

function WeightChart({ weights }: { weights: BodyWeightEntry[] }) {
  if (weights.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Mindestens 2 Einträge für Graphen</Text>
      </View>
    );
  }

  const sorted = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const vals = sorted.map(w => w.weight);
  const minW = Math.min(...vals);
  const maxW = Math.max(...vals);
  const range = maxW - minW || 1;

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / (sorted.length - 1)) * innerW;
  const toY = (w: number) => PAD.top + (1 - (w - minW) / range) * innerH;

  const points = sorted.map((w, i) => `${toX(i)},${toY(w.weight)}`).join(' ');

  const gridWeights = [minW, minW + range * 0.5, maxW];

  return (
    <View style={styles.chartBox}>
      <Svg width={CHART_W} height={CHART_H}>
        {gridWeights.map((gw, i) => {
          const y = toY(gw);
          return (
            <Line key={i} x1={PAD.left} y1={y} x2={CHART_W - PAD.right} y2={y}
              stroke={Colors.border} strokeWidth="1" />
          );
        })}
        {gridWeights.map((gw, i) => (
          <SvgText key={i} x={PAD.left - 4} y={toY(gw) + 4}
            fontSize="9" fill={Colors.textMuted} textAnchor="end">
            {gw.toFixed(1)}
          </SvgText>
        ))}

        <Polyline points={points} fill="none" stroke={Colors.accent} strokeWidth="2" strokeLinejoin="round" />

        {sorted.map((w, i) => (
          <Circle key={w.id} cx={toX(i)} cy={toY(w.weight)} r="4"
            fill={Colors.accent} stroke={Colors.bg} strokeWidth="2" />
        ))}

        {sorted.map((w, i) => {
          if (sorted.length <= 6 || i === 0 || i === sorted.length - 1) {
            return (
              <SvgText key={`lbl-${w.id}`} x={toX(i)} y={CHART_H - 4}
                fontSize="9" fill={Colors.textMuted} textAnchor="middle">
                {formatDateShort(w.date)}
              </SvgText>
            );
          }
          return null;
        })}
      </Svg>
    </View>
  );
}

export default function ProgressScreen() {
  const [tab, setTab] = useState<'fotos' | 'gewicht'>('fotos');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightNote, setWeightNote] = useState('');
  const [fullscreenPhoto, setFullscreenPhoto] = useState<ProgressPhoto | null>(null);

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
          setFullscreenPhoto(null);
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
          <Text style={[styles.tabBtnText, tab === 'fotos' && styles.tabBtnTextActive]}>📸 Fotos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'gewicht' && styles.tabBtnActive]}
          onPress={() => setTab('gewicht')}
        >
          <Text style={[styles.tabBtnText, tab === 'gewicht' && styles.tabBtnTextActive]}>⚖️ Gewicht</Text>
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
                  onPress={() => setFullscreenPhoto(p)}
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
          <TouchableOpacity style={styles.addWeightBtn} onPress={() => setShowWeightModal(true)}>
            <Text style={styles.addWeightBtnText}>+ Gewicht eintragen</Text>
          </TouchableOpacity>

          {weights.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚖️</Text>
              <Text style={styles.emptyText}>Noch kein Gewicht eingetragen</Text>
            </View>
          ) : (
            <>
              <WeightChart weights={weights} />
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

      {/* Foto Vollbild */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade" onRequestClose={() => setFullscreenPhoto(null)}>
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenPhoto(null)}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullscreenPhoto && (
            <>
              <Image source={{ uri: fullscreenPhoto.uri }} style={styles.fullscreenImage} resizeMode="contain" />
              <Text style={styles.fullscreenDate}>{formatDate(fullscreenPhoto.date)}</Text>
              <TouchableOpacity style={styles.fullscreenDelete} onPress={() => deletePhoto(fullscreenPhoto.id)}>
                <Text style={styles.fullscreenDeleteText}>🗑️ Löschen</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Gewicht Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
        </KeyboardAvoidingView>
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
  chartBox: { backgroundColor: Colors.surface, borderRadius: 14, padding: 8, marginBottom: 16, overflow: 'hidden' },
  chartEmpty: { backgroundColor: Colors.surface, borderRadius: 14, padding: 24, marginBottom: 16, alignItems: 'center' },
  chartEmptyText: { color: Colors.textMuted, fontSize: 13 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
  weightVal: { fontSize: 17, fontWeight: '600', color: Colors.text },
  weightNote: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  weightDate: { fontSize: 13, color: Colors.textMuted },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center', alignItems: 'center' },
  fullscreenClose: { position: 'absolute', top: 54, right: 20, zIndex: 10, padding: 10 },
  fullscreenCloseText: { color: '#fff', fontSize: 22 },
  fullscreenImage: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  fullscreenDate: { color: Colors.textMuted, fontSize: 13, marginTop: 12 },
  fullscreenDelete: { marginTop: 20, padding: 12, backgroundColor: Colors.surface, borderRadius: 10 },
  fullscreenDeleteText: { color: Colors.danger, fontSize: 14, fontWeight: '500' },
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
