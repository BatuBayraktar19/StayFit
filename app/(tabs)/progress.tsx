import { useCallback, useRef, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, TextInput, Modal, FlatList, ActivityIndicator,
  Dimensions, KeyboardAvoidingView, Platform, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useFocusEffect } from 'expo-router';
import { useColors, ColorScheme } from '../../lib/theme';
import { db } from '../../lib/storage';
import { BodyWeightEntry, ProgressPhoto, MeasurementType, BodyMeasurement } from '../../lib/types';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_W - 48) / 3;
const CHART_W = SCREEN_W - 48;
const CHART_H = 140;
const PAD = { left: 36, right: 12, top: 12, bottom: 28 };

const DIAGRAM_W = Math.min(SCREEN_W * 0.5, 200);
const DIAGRAM_H = DIAGRAM_W * (400 / 220);

const MEASURE_LABELS: Record<MeasurementType, string> = {
  neck: 'Nacken', shoulders: 'Schultern', chest: 'Brust',
  bicep_left: 'Bizeps L', bicep_right: 'Bizeps R',
  waist: 'Taille', hips: 'Hüfte',
  thigh_left: 'Oberschenkel L', thigh_right: 'Oberschenkel R',
  calf_left: 'Wade L', calf_right: 'Wade R',
};

const BODY_POINTS: { type: MeasurementType; x: number; y: number }[] = [
  { type: 'neck', x: 110, y: 42 },
  { type: 'shoulders', x: 110, y: 66 },
  { type: 'chest', x: 110, y: 100 },
  { type: 'bicep_left', x: 44, y: 100 },
  { type: 'bicep_right', x: 176, y: 100 },
  { type: 'waist', x: 110, y: 162 },
  { type: 'hips', x: 110, y: 188 },
  { type: 'thigh_left', x: 92, y: 245 },
  { type: 'thigh_right', x: 128, y: 245 },
  { type: 'calf_left', x: 92, y: 335 },
  { type: 'calf_right', x: 128, y: 335 },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

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

function WeightChart({ weights, Colors }: { weights: BodyWeightEntry[]; Colors: ColorScheme }) {
  if (weights.length < 2) {
    return (
      <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 24, marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Mindestens 2 Einträge für Graphen</Text>
      </View>
    );
  }
  const sorted = [...weights].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
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
    <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 8, marginBottom: 16, overflow: 'hidden' }}>
      <Svg width={CHART_W} height={CHART_H}>
        {gridWeights.map((gw, i) => (
          <Line key={i} x1={PAD.left} y1={toY(gw)} x2={CHART_W - PAD.right} y2={toY(gw)}
            stroke={Colors.border} strokeWidth="1" />
        ))}
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

function BodyDiagram({
  latest, onPointPress, Colors,
}: {
  latest: Partial<Record<MeasurementType, BodyMeasurement>>;
  onPointPress: (type: MeasurementType) => void;
  Colors: ColorScheme;
}) {
  const sx = DIAGRAM_W / 220;
  const sy = DIAGRAM_H / 400;
  return (
    <View style={{ width: DIAGRAM_W, height: DIAGRAM_H, alignSelf: 'center', marginBottom: 12 }}>
      <Svg width={DIAGRAM_W} height={DIAGRAM_H} viewBox="0 0 220 400">
        <Circle cx={110} cy={28} r={20} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={100} y={46} width={20} height={14} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={75} y={58} width={70} height={117} rx={10} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={75} y={175} width={70} height={25} rx={8} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={40} y={62} width={18} height={70} rx={9} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={42} y={130} width={15} height={60} rx={7} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={162} y={62} width={18} height={70} rx={9} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={163} y={130} width={15} height={60} rx={7} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={80} y={200} width={28} height={90} rx={10} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={83} y={290} width={22} height={80} rx={8} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={112} y={200} width={28} height={90} rx={10} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
        <Rect x={115} y={290} width={22} height={80} rx={8} fill={Colors.surfaceAlt} stroke={Colors.border} strokeWidth={1.5} />
      </Svg>
      {BODY_POINTS.map(p => {
        const m = latest[p.type];
        return (
          <TouchableOpacity
            key={p.type}
            onPress={() => onPointPress(p.type)}
            style={{
              position: 'absolute',
              left: p.x * sx - 12, top: p.y * sy - 12,
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: m ? Colors.accent : Colors.surface,
              borderWidth: 2, borderColor: Colors.accent,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: '700', color: m ? '#fff' : Colors.accent }}>
              {m ? Math.round(m.value) : '+'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function VolumeChart({ weeks, Colors }: { weeks: { label: string; volume: number }[]; Colors: ColorScheme }) {
  const maxV = Math.max(...weeks.map(w => w.volume), 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const slot = innerW / weeks.length;
  const barW = Math.max(10, slot - 8);
  return (
    <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 8, marginBottom: 16 }}>
      <Svg width={CHART_W} height={CHART_H}>
        {weeks.map((w, i) => {
          const h = (w.volume / maxV) * innerH;
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = PAD.top + innerH - h;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barW} height={Math.max(1, h)} rx={3} fill={Colors.accent} />
              <SvgText x={x + barW / 2} y={CHART_H - PAD.bottom + 12} fontSize="8" fill={Colors.textMuted} textAnchor="middle">
                {w.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function VideoThumb({ uri, onPress, onLongPress }: { uri: string; onPress: () => void; onLongPress?: () => void }) {
  const Colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8}>
      <Text style={{ fontSize: 28, color: '#fff' }}>▶</Text>
    </TouchableOpacity>
  );
}

function ZoomableImage({ uri, onError, style }: { uri: string; onError?: () => void; style: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const state = useRef({ scale: 1, x: 0, y: 0, lastDistance: null as number | null, lastTapTime: 0 });

  function getDistance(touches: { pageX: number; pageY: number }[]) {
    const [a, b] = touches;
    return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
  }

  function resetZoom() {
    state.current.scale = 1;
    state.current.x = 0;
    state.current.y = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          state.current.lastDistance = getDistance(evt.nativeEvent.touches as any);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dist = getDistance(touches as any);
          if (state.current.lastDistance) {
            const factor = dist / state.current.lastDistance;
            const newScale = Math.max(1, Math.min(4, state.current.scale * factor));
            scale.setValue(newScale);
          }
        } else if (touches.length === 1 && state.current.scale > 1) {
          translateX.setValue(state.current.x + gestureState.dx);
          translateY.setValue(state.current.y + gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        // @ts-ignore
        const currentScale = scale.__getValue();
        state.current.scale = currentScale;
        if (currentScale > 1) {
          // @ts-ignore
          state.current.x = translateX.__getValue();
          // @ts-ignore
          state.current.y = translateY.__getValue();
        } else {
          resetZoom();
        }
        state.current.lastDistance = null;

        const isTap = Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;
        if (isTap) {
          const now = Date.now();
          if (now - state.current.lastTapTime < 300) {
            if (state.current.scale > 1) {
              resetZoom();
            } else {
              state.current.scale = 2.5;
              Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
            }
          }
          state.current.lastTapTime = now;
        }
      },
    })
  ).current;

  return (
    <View style={[style, { overflow: 'hidden' }]} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        resizeMode="contain"
        onError={onError}
        style={{ width: '100%', height: '100%', transform: [{ scale }, { translateX }, { translateY }] }}
      />
    </View>
  );
}

function FullscreenVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; p.play(); });
  return (
    <VideoView player={player} style={{ width: SCREEN_W, height: SCREEN_W * 0.75 }} contentFit="contain" nativeControls />
  );
}

export default function ProgressScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [tab, setTab] = useState<'fotos' | 'gewicht' | 'masse' | 'volumen'>('fotos');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightNote, setWeightNote] = useState('');
  const [editingWeight, setEditingWeight] = useState<BodyWeightEntry | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<ProgressPhoto | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const [latestMeasurements, setLatestMeasurements] = useState<Partial<Record<MeasurementType, BodyMeasurement>>>({});
  const [measureType, setMeasureType] = useState<MeasurementType | null>(null);
  const [measureInput, setMeasureInput] = useState('');

  const [volumeWeeks, setVolumeWeeks] = useState<{ label: string; volume: number }[]>([]);
  const [topExercises, setTopExercises] = useState<{ name: string; volume: number }[]>([]);
  const [volumeLoading, setVolumeLoading] = useState(false);

  function markBroken(id: string) {
    setBrokenIds(prev => new Set(prev).add(id));
  }

  useFocusEffect(
    useCallback(() => {
      db.photos.getAll().then(p => setPhotos(p.map(x => ({ ...x, type: x.type ?? 'photo' }))));
      db.bodyweight.getAll().then(setWeights);
      db.bodyMeasurements.getLatest().then(setLatestMeasurements);
      loadVolumeData();
    }, [])
  );

  async function loadVolumeData() {
    setVolumeLoading(true);
    try {
      const programs = await db.programs.getAll();
      const entries: { date: string; name: string; volume: number }[] = [];
      for (const p of programs) {
        const sessions = await db.sessions.getByProgram(p.id);
        for (const s of sessions) {
          const exs = await db.exercises.getBySession(s.id);
          for (const ex of exs) {
            if (ex.type === 'cardio') continue;
            const sets = await db.sets.getByExercise(ex.id);
            for (const set of sets) {
              if (set.is_warmup || set.weight === null) continue;
              const reps = set.is_bilateral ? (set.reps_right ?? 0) + (set.reps_left ?? 0) : (set.reps ?? 0);
              if (reps <= 0) continue;
              entries.push({ date: s.date, name: ex.name, volume: set.weight * reps });
            }
          }
        }
      }

      const currentWs = weekStart(todayStr());
      const weekStarts: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(currentWs + 'T00:00:00');
        d.setDate(d.getDate() - i * 7);
        weekStarts.push(isoDate(d.getFullYear(), d.getMonth(), d.getDate()));
      }
      const buckets: Record<string, number> = {};
      weekStarts.forEach(ws => { buckets[ws] = 0; });
      for (const e of entries) {
        const ws = weekStart(e.date);
        if (ws in buckets) buckets[ws] += e.volume;
      }
      setVolumeWeeks(weekStarts.map(ws => ({ label: formatDateShort(ws), volume: Math.round(buckets[ws]) })));

      const cutoff = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
      })();
      const recent: Record<string, number> = {};
      for (const e of entries) {
        if (e.date < cutoff) continue;
        recent[e.name] = (recent[e.name] ?? 0) + e.volume;
      }
      setTopExercises(
        Object.entries(recent)
          .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 5)
      );
    } finally {
      setVolumeLoading(false);
    }
  }

  function openMeasureModal(type: MeasurementType) {
    setMeasureType(type);
    setMeasureInput(latestMeasurements[type] ? String(latestMeasurements[type]!.value) : '');
  }

  async function saveMeasurement() {
    if (!measureType) return;
    const v = parseFloat(measureInput.replace(',', '.'));
    if (!v || isNaN(v)) return;
    const entry = await db.bodyMeasurements.add(measureType, v, todayStr());
    setLatestMeasurements(prev => ({ ...prev, [measureType]: entry }));
    setMeasureType(null);
    setMeasureInput('');
  }

  async function persistAsset(uri: string, isVideo: boolean): Promise<string> {
    try {
      const dir = FileSystem.documentDirectory + 'progress_media/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const ext = isVideo ? 'mp4' : 'jpg';
      const dest = `${dir}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch {
      return uri;
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Kein Zugriff', 'StayFit braucht Zugriff auf deine Fotos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const today = new Date().toISOString().split('T')[0];
      const isVideo = asset.type === 'video';
      const persistedUri = await persistAsset(asset.uri, isVideo);
      const photo = await db.photos.add(persistedUri, today, isVideo ? 'video' : 'photo');
      setPhotos(prev => [photo, ...prev]);
    }
  }

  async function saveToGallery(uri: string, showSuccess = true) {
    try {
      const available = await MediaLibrary.isAvailableAsync();
      if (!available) {
        Alert.alert('Nicht verfügbar', 'Galerie-Speichern ist auf diesem Gerät gerade nicht verfügbar. Eventuell hilft ein App-Update.');
        return;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Kein Zugriff', 'Bitte erlaube StayFit in den Handy-Einstellungen Zugriff auf Fotos/Medien.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      if (showSuccess) Alert.alert('Gespeichert ✓', 'In deiner Galerie gespeichert.');
    } catch (e: any) {
      Alert.alert('Fehler beim Speichern', e?.message ?? 'Unbekannter Fehler.');
    }
  }

  function chooseCameraMode() {
    Alert.alert('Aufnehmen', '', [
      { text: '📷 Foto', onPress: () => takePhoto('image') },
      { text: '🎥 Video', onPress: () => takePhoto('video') },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }

  async function takePhoto(mode: 'image' | 'video') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Kein Zugriff', 'StayFit braucht Kamera-Zugriff.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      mediaTypes: mode === 'video' ? ['videos'] : ['images'],
      videoMaxDuration: mode === 'video' ? 120 : undefined,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const today = new Date().toISOString().split('T')[0];
      const isVideo = asset.type === 'video';
      const persistedUri = await persistAsset(asset.uri, isVideo);
      const photo = await db.photos.add(persistedUri, today, isVideo ? 'video' : 'photo');
      setPhotos(prev => [photo, ...prev]);
      saveToGallery(persistedUri, false);
    }
  }

  async function deletePhoto(id: string) {
    Alert.alert('Löschen?', '', [
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

  function openPhotoOptions(p: ProgressPhoto) {
    Alert.alert(p.type === 'video' ? 'Video' : 'Foto', '', [
      { text: '📥 In Galerie speichern', onPress: () => saveToGallery(p.uri) },
      { text: '🗑️ Löschen', style: 'destructive', onPress: () => deletePhoto(p.id) },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }

  function openWeightEdit(entry: BodyWeightEntry) {
    setEditingWeight(entry);
    setWeightInput(String(entry.weight));
    setWeightNote(entry.note ?? '');
    setShowWeightModal(true);
  }

  function openWeightAdd() {
    setEditingWeight(null);
    setWeightInput('');
    setWeightNote('');
    setShowWeightModal(true);
  }

  async function saveWeight() {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (!w || isNaN(w)) return;
    const today = new Date().toISOString().split('T')[0];
    if (editingWeight) {
      await db.bodyweight.delete(editingWeight.id);
      const entry = await db.bodyweight.add(w, editingWeight.date, weightNote || undefined);
      setWeights(prev => prev.map(x => x.id === editingWeight.id ? entry : x));
    } else {
      const entry = await db.bodyweight.add(w, today, weightNote || undefined);
      setWeights(prev => [entry, ...prev]);
    }
    setWeightInput(''); setWeightNote(''); setShowWeightModal(false); setEditingWeight(null);
  }

  async function deleteWeight(id: string) {
    Alert.alert('Eintrag löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await db.bodyweight.delete(id);
          setWeights(prev => prev.filter(w => w.id !== id));
        },
      },
    ]);
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
        <TouchableOpacity style={[styles.tabBtn, tab === 'fotos' && styles.tabBtnActive]} onPress={() => setTab('fotos')}>
          <Text style={[styles.tabBtnText, tab === 'fotos' && styles.tabBtnTextActive]} numberOfLines={1}>📸 Fotos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'gewicht' && styles.tabBtnActive]} onPress={() => setTab('gewicht')}>
          <Text style={[styles.tabBtnText, tab === 'gewicht' && styles.tabBtnTextActive]} numberOfLines={1}>⚖️ Gewicht</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'masse' && styles.tabBtnActive]} onPress={() => setTab('masse')}>
          <Text style={[styles.tabBtnText, tab === 'masse' && styles.tabBtnTextActive]} numberOfLines={1}>📏 Maße</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'volumen' && styles.tabBtnActive]} onPress={() => setTab('volumen')}>
          <Text style={[styles.tabBtnText, tab === 'volumen' && styles.tabBtnTextActive]} numberOfLines={1}>📊 Volumen</Text>
        </TouchableOpacity>
      </View>

      {tab === 'fotos' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoActionBtn} onPress={chooseCameraMode}>
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
              <Text style={styles.emptyHint}>Füge dein erstes Foto oder Video hinzu</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map(p => (
                <View key={p.id}>
                  {p.type === 'video' ? (
                    <VideoThumb uri={p.uri} onPress={() => setFullscreenPhoto(p)} onLongPress={() => openPhotoOptions(p)} />
                  ) : brokenIds.has(p.id) ? (
                    <TouchableOpacity onPress={() => deletePhoto(p.id)} activeOpacity={0.8} style={styles.brokenThumb}>
                      <Text style={styles.brokenThumbIcon}>🖼️</Text>
                      <Text style={styles.brokenThumbText}>nicht verfügbar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setFullscreenPhoto(p)} onLongPress={() => openPhotoOptions(p)} activeOpacity={0.8}>
                      <Image source={{ uri: p.uri }} style={styles.photoThumb} onError={() => markBroken(p.id)} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.photoDate}>{formatDate(p.date)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : tab === 'gewicht' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.addWeightBtn} onPress={openWeightAdd}>
            <Text style={styles.addWeightBtnText}>+ Gewicht eintragen</Text>
          </TouchableOpacity>
          {weights.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚖️</Text>
              <Text style={styles.emptyText}>Noch kein Gewicht eingetragen</Text>
            </View>
          ) : (
            <>
              <WeightChart weights={weights} Colors={Colors} />
              {weights.map(w => (
                <TouchableOpacity key={w.id} style={styles.weightRow} onPress={() => openWeightEdit(w)} onLongPress={() => deleteWeight(w.id)}>
                  <View>
                    <Text style={styles.weightVal}>{w.weight} kg</Text>
                    {w.note && <Text style={styles.weightNote}>{w.note}</Text>}
                  </View>
                  <View style={styles.weightRight}>
                    <Text style={styles.weightDate}>{formatDate(w.date)}</Text>
                    <Text style={styles.editHint}>Tippen zum Bearbeiten</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      ) : tab === 'masse' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.diagramHint}>Tippe auf einen Punkt um ein Maß einzutragen</Text>
          <BodyDiagram latest={latestMeasurements} onPointPress={openMeasureModal} Colors={Colors} />
          <View style={styles.measureGrid}>
            {BODY_POINTS.map(p => {
              const m = latestMeasurements[p.type];
              return (
                <TouchableOpacity key={p.type} style={styles.measureCard} onPress={() => openMeasureModal(p.type)}>
                  <Text style={styles.measureCardLabel}>{MEASURE_LABELS[p.type]}</Text>
                  <Text style={styles.measureCardValue}>{m ? `${m.value} cm` : '—'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {volumeLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : volumeWeeks.every(w => w.volume === 0) ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>Noch kein Volumen getrackt</Text>
              <Text style={styles.emptyHint}>Trainiere ein paar Sätze mit Gewicht — das Volumen erscheint hier</Text>
            </View>
          ) : (
            <>
              <Text style={styles.diagramHint}>Gesamtvolumen (kg × Wdh.) pro Woche, letzte 8 Wochen</Text>
              <VolumeChart weeks={volumeWeeks} Colors={Colors} />
              {topExercises.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Top Übungen (letzte 7 Tage)</Text>
                  {topExercises.map((e, i) => (
                    <View key={e.name} style={styles.topExerciseRow}>
                      <Text style={styles.topExerciseRank}>{i + 1}</Text>
                      <Text style={styles.topExerciseName}>{e.name}</Text>
                      <Text style={styles.topExerciseVol}>{e.volume.toLocaleString('de-DE')} kg</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Foto / Video Vollbild */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade" onRequestClose={() => setFullscreenPhoto(null)}>
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenPhoto(null)}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullscreenPhoto && (
            <>
              {fullscreenPhoto.type === 'video'
                ? <FullscreenVideo uri={fullscreenPhoto.uri} />
                : brokenIds.has(fullscreenPhoto.id)
                  ? (
                    <View style={styles.brokenFullscreen}>
                      <Text style={styles.brokenThumbIcon}>🖼️</Text>
                      <Text style={styles.brokenThumbText}>Bild nicht mehr verfügbar</Text>
                    </View>
                  )
                  : <ZoomableImage uri={fullscreenPhoto.uri} style={styles.fullscreenImage} onError={() => markBroken(fullscreenPhoto.id)} />
              }
              <Text style={styles.fullscreenDate}>{formatDate(fullscreenPhoto.date)}</Text>
              <View style={styles.fullscreenBtnRow}>
                <TouchableOpacity style={styles.fullscreenActionBtn} onPress={() => saveToGallery(fullscreenPhoto.uri)}>
                  <Text style={styles.fullscreenActionText}>📥 Herunterladen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fullscreenActionBtn} onPress={() => deletePhoto(fullscreenPhoto.id)}>
                  <Text style={styles.fullscreenDeleteText}>🗑️ Löschen</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Gewicht Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide" onRequestClose={() => setShowWeightModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{editingWeight ? 'Gewicht bearbeiten' : 'Gewicht eintragen'}</Text>
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
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => { setShowWeightModal(false); setEditingWeight(null); }}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={saveWeight}>
                  <Text style={styles.modalBtnCreateText}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Maß eintragen */}
      <Modal visible={!!measureType} transparent animationType="slide" onRequestClose={() => setMeasureType(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{measureType ? MEASURE_LABELS[measureType] : ''} eintragen</Text>
              <TextInput
                style={styles.input}
                placeholder="cm"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={measureInput}
                onChangeText={setMeasureInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveMeasurement}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setMeasureType(null)}>
                  <Text style={styles.modalBtnCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCreate]} onPress={saveMeasurement}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  weightBadge: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  weightBadgeText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 4, backgroundColor: Colors.surface, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.accent },
  tabBtnText: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  tabBtnTextActive: { color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  photoActionBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 14, alignItems: 'center' },
  photoActionText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: Colors.surface },
  videoThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  videoPlayIcon: { fontSize: 28, color: '#fff' },
  photoDate: { fontSize: 10, color: Colors.textMuted, marginTop: 3, textAlign: 'center', width: PHOTO_SIZE },
  brokenThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', padding: 4 },
  brokenThumbIcon: { fontSize: 22, marginBottom: 4, opacity: 0.4 },
  brokenThumbText: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  brokenFullscreen: { width: SCREEN_W, height: SCREEN_W, alignItems: 'center', justifyContent: 'center' },
  addWeightBtn: { backgroundColor: Colors.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  addWeightBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  chartBox: { backgroundColor: Colors.surface, borderRadius: 14, padding: 8, marginBottom: 16, overflow: 'hidden' },
  chartEmpty: { backgroundColor: Colors.surface, borderRadius: 14, padding: 24, marginBottom: 16, alignItems: 'center' },
  chartEmptyText: { color: Colors.textMuted, fontSize: 13 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
  weightVal: { fontSize: 17, fontWeight: '600', color: Colors.text },
  weightNote: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  weightRight: { alignItems: 'flex-end' },
  weightDate: { fontSize: 13, color: Colors.textMuted },
  editHint: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center', alignItems: 'center' },
  fullscreenClose: { position: 'absolute', top: 54, right: 20, zIndex: 10, padding: 10 },
  fullscreenCloseText: { color: '#fff', fontSize: 22 },
  fullscreenImage: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  fullscreenVideo: { width: SCREEN_W, height: SCREEN_W * 0.75 },
  fullscreenDate: { color: Colors.textMuted, fontSize: 13, marginTop: 12 },
  fullscreenBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  fullscreenActionBtn: { padding: 12, backgroundColor: Colors.surface, borderRadius: 10 },
  fullscreenActionText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  fullscreenDeleteText: { color: Colors.danger, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.surfaceAlt },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalBtnCreate: { backgroundColor: Colors.accent },
  modalBtnCreateText: { color: '#fff', fontWeight: '600' },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  diagramHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 12 },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measureCard: { width: (SCREEN_W - 32 - 16) / 3, backgroundColor: Colors.surface, borderRadius: 10, padding: 10, alignItems: 'center' },
  measureCardLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, textAlign: 'center' },
  measureCardValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  topExerciseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  topExerciseRank: { color: Colors.accent, fontSize: 14, fontWeight: '700', width: 18 },
  topExerciseName: { color: Colors.text, fontSize: 14, flex: 1 },
  topExerciseVol: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  });
}
