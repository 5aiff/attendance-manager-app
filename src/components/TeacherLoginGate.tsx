import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { colors } from '../constants/colors';
import { verifyTeacherPin } from '../storage/settingsStorage';

interface TeacherLoginGateProps {
  onUnlocked: () => void;
}

export function TeacherLoginGate({ onUnlocked }: TeacherLoginGateProps) {
  const [pin, setPin] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  const unlock = async () => {
    if (!pin.trim()) {
      setError('Enter your teacher PIN.');
      return;
    }

    setIsChecking(true);
    const isValid = await verifyTeacherPin(pin);
    setIsChecking(false);

    if (!isValid) {
      setError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }

    onUnlocked();
  };

  const appendDigit = (digit: string) => {
    setError('');
    setPin((current) => `${current}${digit}`.slice(0, 8));
  };

  const deleteDigit = () => {
    setError('');
    setPin((current) => current.slice(0, -1));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.brandIcon}>
        <Feather name="book-open" color={colors.primary} size={34} />
      </View>

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Enter PIN to access your classroom</Text>

      <View style={styles.pinDots}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index ? styles.pinDotFilled : null,
              error ? styles.pinDotError : null,
            ]}
          />
        ))}
      </View>

      <Text style={[styles.errorText, error ? styles.errorTextVisible : null]}>{error || ' '}</Text>

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <Pressable key={digit} style={styles.keyButton} onPress={() => appendDigit(digit)}>
            <Text style={styles.keyText}>{digit}</Text>
          </Pressable>
        ))}

        <Pressable style={styles.iconKeyButton} onPress={deleteDigit}>
          <Feather name="delete" color={colors.textSecondary} size={24} />
        </Pressable>
        <Pressable style={styles.keyButton} onPress={() => appendDigit('0')}>
          <Text style={styles.keyText}>0</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, isChecking ? styles.disabledButton : null]}
          onPress={unlock}
          disabled={isChecking}
        >
          <Feather name="check" color={colors.surface} size={34} />
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
    padding: 28,
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    height: 96,
    justifyContent: 'center',
    marginBottom: 34,
    shadowColor: '#000000',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    width: 96,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 19,
    lineHeight: 27,
    marginTop: 14,
    textAlign: 'center',
  },
  pinDots: {
    flexDirection: 'row',
    gap: 22,
    justifyContent: 'center',
    marginTop: 58,
  },
  pinDot: {
    borderColor: '#C5C6D6',
    borderRadius: 16,
    borderWidth: 4,
    height: 32,
    width: 32,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pinDotError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 22,
    minHeight: 24,
    opacity: 0,
    textAlign: 'center',
  },
  errorTextVisible: {
    opacity: 1,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    justifyContent: 'center',
    marginTop: 44,
    width: '100%',
  },
  keyButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 43,
    height: 86,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    width: 86,
  },
  keyText: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '500',
  },
  iconKeyButton: {
    alignItems: 'center',
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 43,
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
