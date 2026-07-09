import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, ColorScheme } from '../../lib/theme';

export default function ProfileScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.hint}>Login & Einstellungen kommen nach dem ersten Test.</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emoji: { fontSize: 48, marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 8 },
    hint: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  });
}
