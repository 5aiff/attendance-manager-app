import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { colors } from '../../src/constants/colors';
import {
  AppSettings,
  defaultSettings,
  getAppSettings,
  saveAppSettings,
  setTeacherPin,
} from '../../src/storage/settingsStorage';
import { exportBackup, restoreBackupFromPicker } from '../../src/utils/backupRestore';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [fineAmount, setFineAmount] = useState(`${defaultSettings.dailyFineAmount}`);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const storedSettings = await getAppSettings();
    setSettings(storedSettings);
    setFineAmount(`${storedSettings.dailyFineAmount}`);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings().catch((error) => {
        console.error('Failed to load settings', error);
      });
    }, [loadSettings])
  );

  const updateSetting = (field: keyof AppSettings, value: string | boolean) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    const parsedFine = Number(fineAmount);

    if (!Number.isFinite(parsedFine) || parsedFine <= 0) {
      Alert.alert('Invalid fine', 'Daily fine amount must be greater than 0.');
      return;
    }

    if (settings.loginEnabled && !settings.pinHash && !newPin) {
      Alert.alert('PIN required', 'Set a teacher PIN before enabling login.');
      return;
    }

    if (newPin || confirmPin) {
      if (newPin.length < 4) {
        Alert.alert('PIN too short', 'Use at least 4 digits for the teacher PIN.');
        return;
      }

      if (newPin !== confirmPin) {
        Alert.alert('PIN mismatch', 'The PIN confirmation does not match.');
        return;
      }
    }

    try {
      setIsSaving(true);
      let nextSettings: AppSettings = {
        ...settings,
        dailyFineAmount: parsedFine,
        teacherName: settings.teacherName.trim(),
        teacherPhone: settings.teacherPhone.trim(),
        schoolName: settings.schoolName.trim(),
        className: settings.className.trim(),
      };

      if (!nextSettings.loginEnabled) {
        nextSettings = {
          ...nextSettings,
          pinHash: undefined,
          pinSalt: undefined,
        };
      } else if (newPin) {
        nextSettings = await setTeacherPin(nextSettings, newPin);
      }

      await saveAppSettings(nextSettings);
      setSettings(nextSettings);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Settings saved', 'Your offline settings have been updated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save settings.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportAppBackup = async () => {
    try {
      await exportBackup();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export backup.';
      Alert.alert('Backup failed', message);
    }
  };

  const confirmRestoreBackup = () => {
    Alert.alert(
      'Restore backup?',
      'This will replace current classes, students, attendance, fines, and settings with the selected backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: restoreAppBackup,
        },
      ]
    );
  };

  const restoreAppBackup = async () => {
    try {
      const restored = await restoreBackupFromPicker();

      if (restored) {
        await loadSettings();
        Alert.alert('Backup restored', 'Your offline data has been restored. Reopen screens to refresh the latest data.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restore backup.';
      Alert.alert('Restore failed', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Teacher profile, fine rules, and local login</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="user" color={colors.primary} size={22} />
          <Text style={styles.cardTitle}>Teacher Profile</Text>
        </View>

        <LabeledInput
          label="Teacher Name"
          value={settings.teacherName}
          onChangeText={(value) => updateSetting('teacherName', value)}
        />
        <LabeledInput
          label="Phone Number"
          value={settings.teacherPhone}
          onChangeText={(value) => updateSetting('teacherPhone', value)}
          keyboardType="phone-pad"
        />
        <LabeledInput
          label="School Name"
          value={settings.schoolName}
          onChangeText={(value) => updateSetting('schoolName', value)}
        />
        <LabeledInput
          label="Class Name"
          value={settings.className}
          onChangeText={(value) => updateSetting('className', value)}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="sliders" color={colors.primary} size={22} />
          <Text style={styles.cardTitle}>Fine Rules</Text>
        </View>

        <CurrencyInput
          label="Daily Absence Fine"
          value={fineAmount}
          onChangeText={setFineAmount}
        />
        <Text style={styles.helperText}>This amount is used for future automatic absence fines.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="lock" color={colors.primary} size={22} />
          <Text style={styles.cardTitle}>Teacher Login</Text>
        </View>

        <Pressable
          style={[styles.toggleRow, settings.loginEnabled ? styles.toggleRowActive : null]}
          onPress={() => updateSetting('loginEnabled', !settings.loginEnabled)}
        >
          <View>
            <Text style={styles.toggleTitle}>Require PIN on app start</Text>
            <Text style={styles.helperText}>
              {settings.pinHash ? 'PIN is configured.' : 'Set a PIN to activate teacher login.'}
            </Text>
          </View>
          <View style={[styles.toggle, settings.loginEnabled ? styles.toggleActive : null]}>
            <View style={[styles.toggleKnob, settings.loginEnabled ? styles.toggleKnobActive : null]} />
          </View>
        </Pressable>

        {settings.loginEnabled ? (
          <>
            <LabeledInput
              label={settings.pinHash ? 'New PIN (optional)' : 'Teacher PIN'}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              secureTextEntry
            />
            <LabeledInput
              label="Confirm PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              secureTextEntry
            />
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="database" color={colors.primary} size={22} />
          <Text style={styles.cardTitle}>Backup and Restore</Text>
        </View>

        <Text style={styles.helperText}>
          Save a full offline backup of classes, students, attendance, fine ledger, and settings.
        </Text>

        <View style={styles.backupActions}>
          <Pressable style={styles.backupButton} onPress={exportAppBackup}>
            <Feather name="download" color={colors.surface} size={18} />
            <Text style={styles.backupButtonText}>Export Backup</Text>
          </Pressable>
          <Pressable style={styles.restoreButton} onPress={confirmRestoreBackup}>
            <Feather name="upload" color={colors.danger} size={18} />
            <Text style={styles.restoreButtonText}>Restore</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.aboutRow} onPress={() => router.push('/about')}>
        <View style={styles.aboutIcon}>
          <Feather name="info" color={colors.primary} size={22} />
        </View>
        <View style={styles.aboutText}>
          <Text style={styles.aboutTitle}>About Author</Text>
          <Text style={styles.helperText}>App information and developer details</Text>
        </View>
        <Feather name="chevron-right" color={colors.textMuted} size={22} />
      </Pressable>

      <Pressable style={[styles.saveButton, isSaving ? styles.disabledButton : null]} onPress={saveSettings} disabled={isSaving}>
        <Feather name="save" color={colors.surface} size={18} />
        <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Settings'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

function CurrencyInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.currencyInputWrap}>
        <Text style={styles.currencyPrefix}>Rs.</Text>
        <TextInput
          style={styles.currencyInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 18,
    paddingBottom: 116,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    marginBottom: 14,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  currencyInputWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    flexDirection: 'row',
    minHeight: 50,
  },
  currencyPrefix: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    paddingLeft: 14,
    paddingRight: 10,
  },
  currencyInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingRight: 14,
  },
  helperText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 12,
  },
  toggleRowActive: {
    borderColor: colors.success,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  toggle: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginLeft: 12,
    paddingHorizontal: 3,
    width: 52,
  },
  toggleActive: {
    backgroundColor: colors.success,
  },
  toggleKnob: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    height: 22,
    width: 22,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  aboutRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 14,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backupButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  backupButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  restoreButton: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: 24,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  restoreButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  aboutIcon: {
    alignItems: 'center',
    backgroundColor: '#9AF49B',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  aboutText: {
    flex: 1,
    marginLeft: 12,
  },
  aboutTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 32,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 58,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});
