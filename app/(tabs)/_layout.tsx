import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../src/constants/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 18);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 20, fontWeight: '800' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 6,
          marginVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Feather name="check-square" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <Feather name="clipboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fines"
        options={{
          title: 'Fines',
          tabBarIcon: ({ color, size }) => <Feather name="file-text" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, size }) => <Feather name="users" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
