import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../src/constants/colors';
import { TeacherLoginGate } from '../src/components/TeacherLoginGate';
import { initializeDatabase } from '../src/db/database';
import { getAppSettings } from '../src/storage/settingsStorage';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    Promise.all([initializeDatabase(), getAppSettings()])
      .then(([, settings]) => {
        const shouldRequireLogin = !!settings.loginEnabled && !!settings.pinHash;
        setRequiresLogin(shouldRequireLogin);
        setIsUnlocked(!shouldRequireLogin);
      })
      .catch((error) => {
        console.error('Failed to initialize app', error);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (requiresLogin && !isUnlocked) {
    return <TeacherLoginGate onUnlocked={() => setIsUnlocked(true)} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
