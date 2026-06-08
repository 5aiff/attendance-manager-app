import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { DEFAULT_ABSENCE_FINE } from '../constants/config';
import { createId } from '../utils/id';

const SETTINGS_KEY = 'attendance_manager_settings';

export interface AppSettings {
  dailyFineAmount: number;
  teacherName: string;
  teacherPhone: string;
  schoolName: string;
  className: string;
  loginEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
}

export const defaultSettings: AppSettings = {
  dailyFineAmount: DEFAULT_ABSENCE_FINE,
  teacherName: '',
  teacherPhone: '',
  schoolName: '',
  className: '',
  loginEnabled: false,
};

export async function getAppSettings() {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);

  if (!raw) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...JSON.parse(raw),
    } as AppSettings;
  } catch {
    return defaultSettings;
  }
}

export async function saveAppSettings(settings: AppSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function setTeacherPin(settings: AppSettings, pin: string) {
  const pinSalt = createId('salt');
  const pinHash = await hashPin(pin, pinSalt);

  return {
    ...settings,
    pinHash,
    pinSalt,
    loginEnabled: true,
  };
}

export async function verifyTeacherPin(pin: string) {
  const settings = await getAppSettings();

  if (!settings.loginEnabled || !settings.pinHash || !settings.pinSalt) {
    return true;
  }

  const hash = await hashPin(pin, settings.pinSalt);
  return hash === settings.pinHash;
}

export async function getDailyFineAmount() {
  const settings = await getAppSettings();
  return Number.isFinite(settings.dailyFineAmount) && settings.dailyFineAmount > 0
    ? settings.dailyFineAmount
    : DEFAULT_ABSENCE_FINE;
}

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}
