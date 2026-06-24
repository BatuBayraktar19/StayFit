import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  hint: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
