import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { DEFAULT_CLASS_ID, getDatabase, initializeDatabase } from '../db/database';
import { getAppSettings, saveAppSettings, AppSettings } from '../storage/settingsStorage';

type BackupTableRow = Record<string, string | number | null>;

interface AppBackup {
  app: 'attendance-manager';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  tables: {
    classes: BackupTableRow[];
    students: BackupTableRow[];
    attendance_records: BackupTableRow[];
    ledger_entries: BackupTableRow[];
  };
}

export async function exportBackup() {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  const db = await getDatabase();
  const settings = await getAppSettings();
  const backup: AppBackup = {
    app: 'attendance-manager',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    tables: {
      classes: await db.getAllAsync<BackupTableRow>('SELECT * FROM classes'),
      students: await db.getAllAsync<BackupTableRow>('SELECT * FROM students'),
      attendance_records: await db.getAllAsync<BackupTableRow>('SELECT * FROM attendance_records'),
      ledger_entries: await db.getAllAsync<BackupTableRow>('SELECT * FROM ledger_entries'),
    },
  };

  const directory = new Directory(Paths.document, 'backups');
  directory.create({ intermediates: true, idempotent: true });

  const file = new File(directory, `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup, null, 2));

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Export Attendance Backup',
    mimeType: 'application/json',
    UTI: 'public.json',
  });
}

export async function restoreBackupFromPicker() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: 'application/json',
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return false;
  }

  const file = new File(result.assets[0].uri);
  const content = await file.text();
  const backup = parseBackup(content);

  await restoreBackup(backup);
  return true;
}

function parseBackup(content: string): AppBackup {
  const parsed = JSON.parse(content) as AppBackup;

  if (parsed.app !== 'attendance-manager' || parsed.version !== 1 || !parsed.tables) {
    throw new Error('This is not a valid Attendance Manager backup file.');
  }

  return parsed;
}

async function restoreBackup(backup: AppBackup) {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM ledger_entries');
    await db.runAsync('DELETE FROM attendance_records');
    await db.runAsync('DELETE FROM students');
    await db.runAsync('DELETE FROM classes');

    for (const row of backup.tables.classes) {
      await db.runAsync(
        `
        INSERT INTO classes (id, name, subject, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          `${row.id}`,
          `${row.name ?? ''}`,
          `${row.subject ?? ''}`,
          Number(row.isActive ?? 1),
          `${row.createdAt ?? new Date().toISOString()}`,
          `${row.updatedAt ?? new Date().toISOString()}`,
        ]
      );
    }

    const hasDefaultClass = backup.tables.classes.some((row) => row.id === DEFAULT_CLASS_ID);
    if (!hasDefaultClass) {
      const now = new Date().toISOString();
      await db.runAsync(
        `
        INSERT INTO classes (id, name, subject, isActive, createdAt, updatedAt)
        VALUES (?, 'Default Class', '', 1, ?, ?)
        `,
        [DEFAULT_CLASS_ID, now, now]
      );
    }

    for (const row of backup.tables.students) {
      await db.runAsync(
        `
        INSERT INTO students (
          id, classId, studentCode, rollNumber, name, fatherName, address, imageUri, isActive, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `${row.id}`,
          `${row.classId ?? DEFAULT_CLASS_ID}`,
          `${row.studentCode ?? ''}`,
          `${row.rollNumber ?? ''}`,
          `${row.name ?? ''}`,
          `${row.fatherName ?? ''}`,
          `${row.address ?? ''}`,
          row.imageUri ? `${row.imageUri}` : null,
          Number(row.isActive ?? 1),
          `${row.createdAt ?? new Date().toISOString()}`,
          `${row.updatedAt ?? new Date().toISOString()}`,
        ]
      );
    }

    for (const row of backup.tables.attendance_records) {
      await db.runAsync(
        `
        INSERT INTO attendance_records (id, studentId, classId, date, session, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `${row.id}`,
          `${row.studentId}`,
          `${row.classId ?? DEFAULT_CLASS_ID}`,
          `${row.date}`,
          `${row.session}`,
          `${row.status}`,
          `${row.createdAt ?? new Date().toISOString()}`,
          `${row.updatedAt ?? new Date().toISOString()}`,
        ]
      );
    }

    for (const row of backup.tables.ledger_entries) {
      await db.runAsync(
        `
        INSERT INTO ledger_entries (id, studentId, type, amount, reason, sourceAttendanceId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `${row.id}`,
          `${row.studentId}`,
          `${row.type}`,
          Number(row.amount ?? 0),
          `${row.reason ?? ''}`,
          row.sourceAttendanceId ? `${row.sourceAttendanceId}` : null,
          `${row.createdAt ?? new Date().toISOString()}`,
        ]
      );
    }
  });

  await saveAppSettings(backup.settings);
  await initializeDatabase();
}
