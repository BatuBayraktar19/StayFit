import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { db } from '../../lib/storage';
import { STANDARDS, getRank, RANK_CONFIG, Rank, Standard } from '../../lib/strengthStandards';
import { WorkoutSet, Exercise } from '../../lib/types';

type BestLift = { exerciseName: string; weight: number; standard: Standard };

export default function StatsScreen() {
  const [bestLifts, setBestLifts] = useState<BestLift[]>([]);
  const [selected, setSelected] = useState<BestLift | null>(null);
  const [filterRank, setFilterRank] = useState<Rank | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      loadBests();
    }, [])
  );

  async function loadBests() {
    const programs = await db.programs.getAll();
    const allSets: { set: WorkoutSet; exerciseName: string }[] = [];

    for (const p of programs) {
      const sessions = await db.sessions.getByProgram(p.id);
      for (const s of sessions) {
        const exercises = await db.exercises.getBySession(s.id);
        for (const ex of exercises) {
          const sets = await db.sets.getByExercise(ex.id);
          sets.filter(set => !set.is_warmup && set.weight !== null).forEach(set => {
            allSets.push({ set, exerciseName: ex.name });
          });
        }
      }
    }

    const bests = new Map<string, number>();
    for (const { set, exerciseName } of allSets) {
      const key = exerciseName.toLowerCase();
      if (!bests.has(key) || set.weight! > bests.get(key)!) {
        bests.set(key, set.weight!);
      }
    }

    const results: BestLift[] = [];
    for (const std of STANDARDS) {
      const key = std.exercise.toLowerCase();
      let weight = 0;
      for (const [k, v] of bests.entries()) {
        if (k.includes(key) || key.includes(k)) { weight = Math.max(weight, v); }
      }
      if (weight > 0) results.push({ exerciseName: std.exercise, weight, standard: std });
    }

    results.sort((a, b) => {
      const ra = getRank(a.weight, a.standard).rank;
      const rb = getRank(b.weight, b.standard).rank;
      const order: Rank[] = ['elite', 'stark', 'fortgeschritten', 'anfänger'];
      return order.indexOf(ra) - order.indexOf(rb);
    });

    setBestLifts(results);
  }

  const ranks: (Rank | 'all')[] = ['all', 'elite', 'stark', 'fortgeschritten', 'anfänger'];
  const filtered = filterRank === 'all' ? bestLifts : bestLifts.filter(l => getRank(l.weight, l.standard).rank === filterRank);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Stärke</Text>
        <Text style={styles.subtitle}>{bestLifts.length} Übungen getrackt</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {ranks.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.filterBtn, filterRank === r && styles.filterBtnActive]}
            onPress={() => setFilterRank(r)}
          >
            <Text style={[styles.filterText, filterRank === r && styles.filterTextActive]}>
              {r === 'all' ? 'Alle' : `${RANK_CONFIG[r as Rank].emoji} ${RANK_CONFIG[r as Rank].label}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {bestLifts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💪</Text>
          <Text style={styles.emptyTitle}>Noch keine Lifts</Text>
          <Text style={styles.emptyHint}>Tracke Übungen wie Bench Press, Squat oder Deadlift — dann siehst du hier deinen Rang.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={l => l.exerciseName}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const { rank, next, progress } = getRank(item.weight, item.standard);
            const cfg = RANK_CONFIG[rank];
            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{item.exerciseName}</Text>
                    <Text style={styles.cardCategory}>{item.standard.category}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardWeight}>{item.weight} kg</Text>
                    <View style={[styles.rankBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
                      <Text style={[styles.rankBadgeText, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: cfg.color }]} />
                </View>
                {next && (
                  <Text style={styles.nextTarget}>
                    Nächste Stufe: {next} kg ({next - item.weight} kg fehlen)
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selected && (() => {
              const { rank } = getRank(selected.weight, selected.standard);
              const std = selected.standard;
              const cfg = RANK_CONFIG[rank];
              return (
                <>
                  <Text style={styles.modalTitle}>{selected.exerciseName}</Text>
                  <Text style={styles.modalWeight}>Dein Bestes: {selected.weight} kg</Text>

                  <View style={styles.levelsGrid}>
                    {(['anfänger', 'fortgeschritten', 'stark', 'elite'] as Rank[]).map(r => {
                      const isReached = selected.weight >= std.levels[r];
                      const rcfg = RANK_CONFIG[r];
                      return (
                        <View key={r} style={[styles.levelBox, isReached && { borderColor: rcfg.color }]}>
                          <Text style={styles.levelEmoji}>{rcfg.emoji}</Text>
                          <Text style={[styles.levelLabel, isReached && { color: rcfg.color }]}>{rcfg.label}</Text>
                          <Text style={[styles.levelWeight, isReached && { color: '#fff' }]}>{std.levels[r]} kg</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={[styles.currentRankBox, { borderColor: cfg.color }]}>
                    <Text style={[styles.currentRankText, { color: cfg.color }]}>
                      {cfg.emoji} Du bist: {cfg.label}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtnText}>Schließen</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  filterScroll: { maxHeight: 48, marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterBtn: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterBtnActive: { backgroundColor: Colors.accent },
  filterText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  cardCategory: { fontSize: 12, color: Colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  cardWeight: { fontSize: 18, fontWeight: '700', color: Colors.text },
  rankBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rankBadgeText: { fontSize: 12, fontWeight: '600' },
  progressBarBg: { height: 5, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: 5, borderRadius: 3 },
  nextTarget: { fontSize: 11, color: Colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  modalWeight: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  levelsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  levelBox: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  levelEmoji: { fontSize: 18, marginBottom: 4 },
  levelLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 3, fontWeight: '500' },
  levelWeight: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  currentRankBox: { borderWidth: 1.5, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  currentRankText: { fontSize: 16, fontWeight: '700' },
  closeBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 14, alignItems: 'center' },
  closeBtnText: { color: Colors.textSecondary, fontWeight: '500' },
});
