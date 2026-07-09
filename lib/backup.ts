import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BACKUP_KEYS = ['programs', 'sessions', 'exercises', 'sets', 'bodyweight', 'photos', 'food', 'nutritionGoal', 'templates'];

export async function exportBackup(): Promise<void> {
  const data: Record<string, unknown> = { version: 1, exportedAt: new Date().toISOString() };
  for (const key of BACKUP_KEYS) {
    const raw = await AsyncStorage.getItem(key);
    data[key] = raw ? JSON.parse(raw) : [];
  }

  const json = JSON.stringify(data, null, 2);
  const filename = `stayfit_backup_${new Date().toISOString().split('T')[0]}.json`;
  const path = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Teilen nicht verfügbar auf diesem Gerät.');

  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'StayFit Backup teilen',
    UTI: 'public.json',
  });
}

export async function importBackup(): Promise<{ success: boolean; message: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, message: 'Abgebrochen' };
  }

  try {
    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const data = JSON.parse(raw);

    if (!data.version || !data.programs) {
      return { success: false, message: 'Ungültige Backup-Datei.' };
    }

    for (const key of BACKUP_KEYS) {
      if (data[key] !== undefined) {
        await AsyncStorage.setItem(key, JSON.stringify(data[key]));
      }
    }

    return { success: true, message: 'Backup erfolgreich importiert!' };
  } catch {
    return { success: false, message: 'Fehler beim Lesen der Datei.' };
  }
}
