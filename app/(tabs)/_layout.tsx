import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../src/constants/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceMuted },
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 24, fontWeight: '800' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          height: 68 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          borderRadius: 28,
          marginHorizontal: 2,
          marginVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
          lineHeight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="bar-chart-2" color={color} />,
        }}
      />
      <Tabs.Screen
        name="fines"
        options={{
          title: 'Fines',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="file-text" color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  color,
  focused,
  name,
}: {
  color: string;
  focused: boolean;
  name: keyof typeof Feather.glyphMap;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: focused ? colors.primary : 'transparent',
        borderColor: focused ? colors.primary : 'transparent',
        borderRadius: 16,
        borderWidth: 1,
        height: 32,
        justifyContent: 'center',
        marginBottom: 2,
        minWidth: 48,
        shadowColor: '#000000',
        shadowOffset: { height: 3, width: 0 },
        shadowOpacity: focused ? 0.14 : 0,
        shadowRadius: 8,
      }}
    >
      <Feather name={name} color={focused ? colors.surface : color} size={20} />
    </View>
  );
}
