import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

type Translation = {
  id: number;
  name: string;
  description: string;
  language: number;
};

type WgerExercise = {
  id: number;
  category: { id: number; name: string } | null;
  muscles: { id: number; name_en: string }[];
  muscles_secondary: { id: number; name_en: string }[];
  equipment: { id: number; name: string }[];
  translations: Translation[];
  name: string;
  description: string;
};

const WGER_BASE = 'https://wger.de/api/v2';
const ENGLISH = 2;

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function getEnTranslation(ex: WgerExercise) {
  return ex.translations.find(t => t.language === ENGLISH);
}

export default function LexikonScreen() {
  const [exercises, setExercises] = useState<WgerExercise[]>([]);
  const [filtered, setFiltered] = useState<WgerExercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WgerExercise | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadExercises(`${WGER_BASE}/exerciseinfo/?format=json&language=2&limit=100&ordering=category`);
  }, []);

  async function loadExercises(url: string, append = false) {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError('');

      const res = await fetch(url);
      const data = await res.json();

      const enriched: WgerExercise[] = data.results
        .map((e: WgerExercise) => {
          const tr = getEnTranslation(e);
          return { ...e, name: tr?.name ?? '', description: tr?.description ?? '' };
        })
        .filter((e: WgerExercise) => e.name.trim().length > 0);

      setExercises(prev => append ? [...prev, ...enriched] : enriched);
      setFiltered(prev => append ? [...prev, ...enriched] : enriched);
      setNextUrl(data.next ?? null);
    } catch {
      setError('Keine Verbindung zu wger.de — bitte Internet prüfen.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(exercises); return; }
    setFiltered(exercises.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.category?.name ?? '').toLowerCase().includes(q) ||
      e.muscles.some(m => m.name_en.toLowerCase().includes(q))
    ));
  }, [search, exercises]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Lexikon</Text>
        <Text style={styles.count}>{exercises.length} Übungen</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Suchen... z.B. Bench, Squat, Abs"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: Colors.textMuted, fontSize: 16, paddingRight: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Lade Übungs-Datenbank...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadExercises(`${WGER_BASE}/exerciseinfo/?format=json&language=2&limit=100&ordering=category`)}
          >
            <Text style={styles.retryText}>Nochmal versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={styles.list}
          onEndReached={() => { if (nextUrl && !loadingMore) loadExercises(nextUrl, true); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore
            ? <ActivityIndicator color={Colors.accent} style={{ margin: 16 }} />
            : nextUrl
              ? <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadExercises(nextUrl!, true)}>
                  <Text style={styles.loadMoreText}>Mehr laden</Text>
                </TouchableOpacity>
              : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Keine Übung für "{search}"</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.tagRow}>
                  {item.category && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.category.name}</Text>
                    </View>
                  )}
                  {item.muscles.slice(0, 2).map(m => (
                    <View key={m.id} style={[styles.tag, styles.tagMuscle]}>
                      <Text style={[styles.tagText, styles.tagMuscleText]}>{m.name_en}</Text>
                    </View>
                  ))}
                  {item.equipment.slice(0, 1).map(eq => (
                    <View key={eq.id} style={[styles.tag, styles.tagEquip]}>
                      <Text style={[styles.tagText, styles.tagEquipText]}>{eq.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.detailSafe}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.closeBtn}>✕ Schließen</Text>
            </TouchableOpacity>
          </View>
          {selected && (
            <ScrollView contentContainerStyle={styles.detailScroll}>
              <Text style={styles.detailName}>{selected.name}</Text>

              <View style={styles.tagRow}>
                {selected.category && (
                  <View style={styles.tag}><Text style={styles.tagText}>{selected.category.name}</Text></View>
                )}
                {selected.equipment.map(eq => (
                  <View key={eq.id} style={[styles.tag, styles.tagEquip]}>
                    <Text style={[styles.tagText, styles.tagEquipText]}>{eq.name}</Text>
                  </View>
                ))}
              </View>

              {selected.muscles.length > 0 && (
                <View style={[styles.detailSection, { marginTop: 16 }]}>
                  <Text style={styles.detailLabel}>Primäre Muskeln</Text>
                  <Text style={styles.detailBody}>{selected.muscles.map(m => m.name_en).join(', ')}</Text>
                </View>
              )}

              {selected.muscles_secondary.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Sekundäre Muskeln</Text>
                  <Text style={styles.detailBody}>{selected.muscles_secondary.map(m => m.name_en).join(', ')}</Text>
                </View>
              )}

              {selected.description ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Beschreibung</Text>
                  <Text style={styles.detailBody}>{stripHtml(selected.description)}</Text>
                </View>
              ) : (
                <View style={styles.detailSection}>
                  <Text style={styles.detailBody}>Keine Beschreibung verfügbar.</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', padding: 16, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  count: { fontSize: 13, color: Colors.textMuted },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 12, paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 12 },
  list: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: { backgroundColor: Colors.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: Colors.textMuted },
  tagMuscle: { backgroundColor: '#1a2a3a' },
  tagMuscleText: { color: '#5a9fd4' },
  tagEquip: { backgroundColor: '#1a2d1a' },
  tagEquipText: { color: '#5ac45a' },
  chevron: { fontSize: 22, color: Colors.textMuted, marginLeft: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, marginTop: 60 },
  loadingText: { color: Colors.textMuted, marginTop: 12, fontSize: 14 },
  errorEmoji: { fontSize: 36, marginBottom: 10 },
  errorText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  loadMoreBtn: { alignItems: 'center', padding: 14 },
  loadMoreText: { color: Colors.accent, fontSize: 14, fontWeight: '500' },
  detailSafe: { flex: 1, backgroundColor: Colors.bg },
  detailHeader: { padding: 16, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn: { color: Colors.accent, fontSize: 16 },
  detailScroll: { padding: 20, paddingBottom: 60 },
  detailName: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  detailSection: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  detailLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  detailBody: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
});
