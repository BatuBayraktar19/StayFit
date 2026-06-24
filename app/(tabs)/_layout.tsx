import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Text } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Training',
          tabBarLabel: 'Training',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏋️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Fortschritt',
          tabBarLabel: 'Fortschritt',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="lexikon"
        options={{
          title: 'Lexikon',
          tabBarLabel: 'Lexikon',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stärke',
          tabBarLabel: 'Stärke',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💪" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Kalorien',
          tabBarLabel: 'Kalorien',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍽️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
