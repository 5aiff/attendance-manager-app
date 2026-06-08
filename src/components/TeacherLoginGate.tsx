import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { colors } from '../constants/colors';
import { verifyTeacherPin } from '../storage/settingsStorage';

interface TeacherLoginGateProps {
  onUnlocked: () => void;
}

export function TeacherLoginGate({ onUnlocked }: TeacherLoginGateProps) {
  const [pin, setPin] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const unlock = async () => {
    if (!pin.trim()) {
      Alert.alert('PIN required', 'Please enter your teacher PIN.');
      return;
    }

    setIsChecking(true);
    const isValid = await verifyTeacherPin(pin);
    setIsChecking(false);

    if (!isValid) {
      Alert.alert('Incorrect PIN', 'Please try again.');
      setPin('');
      return;
    }

    onUnlocked();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="lock" color={colors.surface} size={28} />
        </View>
        <Text style={styles.title}>Teacher Login</Text>
        <Text style={styles.subtitle}>Enter your offline PIN to open Attendance Manager.</Text>

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="Teacher PIN"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          secureTextEntry
        />

        <Pressable style={[styles.button, isChecking ? styles.disabledButton : null]} onPress={unlock} disabled={isChecking}>
          <Text style={styles.buttonText}>{isChecking ? 'Checking...' : 'Unlock'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 22,
    width: '100%',
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 18,
    marginTop: 20,
    minHeight: 54,
    paddingHorizontal: 14,
    textAlign: 'center',
    width: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 6,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 52,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});
