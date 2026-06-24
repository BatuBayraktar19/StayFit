import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '500' },
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="program/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="workout/new" options={{ headerShown: false }} />
        <Stack.Screen name="calendar/[programId]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
