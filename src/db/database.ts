import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('attendance_manager.db');
  }

  return dbPromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY NOT NULL,
      studentCode TEXT NOT NULL DEFAULT '',
      rollNumber TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      fatherName TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      imageUri TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY NOT NULL,
      studentId TEXT NOT NULL,
      date TEXT NOT NULL,
      session TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(studentId, date, session),
      FOREIGN KEY(studentId) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY NOT NULL,
      studentId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      sourceAttendanceId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(studentId) REFERENCES students(id),
      FOREIGN KEY(sourceAttendanceId) REFERENCES attendance_records(id)
    );
  `);

  await ensureStudentColumns();
}

async function ensureStudentColumns() {
  const db = await getDatabase();
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(students)');
  const columnNames = new Set(columns.map((column) => column.name));

  const migrations = [
    { name: 'studentCode', sql: "ALTER TABLE students ADD COLUMN studentCode TEXT NOT NULL DEFAULT ''" },
    { name: 'fatherName', sql: "ALTER TABLE students ADD COLUMN fatherName TEXT NOT NULL DEFAULT ''" },
    { name: 'address', sql: "ALTER TABLE students ADD COLUMN address TEXT NOT NULL DEFAULT ''" },
    { name: 'imageUri', sql: 'ALTER TABLE students ADD COLUMN imageUri TEXT' },
  ];

  for (const migration of migrations) {
    if (!columnNames.has(migration.name)) {
      await db.execAsync(migration.sql);
    }
  }
}
