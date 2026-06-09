import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const DEFAULT_CLASS_ID = 'default-class';

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

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY NOT NULL,
      classId TEXT NOT NULL DEFAULT '${DEFAULT_CLASS_ID}',
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
      classId TEXT NOT NULL DEFAULT '${DEFAULT_CLASS_ID}',
      date TEXT NOT NULL,
      session TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(studentId, date, session),
      FOREIGN KEY(classId) REFERENCES classes(id),
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

  await ensureDefaultClass();
  await ensureStudentColumns();
  await ensureAttendanceColumns();
}

async function ensureDefaultClass() {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT OR IGNORE INTO classes (id, name, subject, isActive, createdAt, updatedAt)
    VALUES (?, 'Default Class', '', 1, ?, ?)
    `,
    [DEFAULT_CLASS_ID, now, now]
  );
}

async function ensureStudentColumns() {
  const db = await getDatabase();
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(students)');
  const columnNames = new Set(columns.map((column) => column.name));

  const migrations = [
    { name: 'classId', sql: `ALTER TABLE students ADD COLUMN classId TEXT NOT NULL DEFAULT '${DEFAULT_CLASS_ID}'` },
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

async function ensureAttendanceColumns() {
  const db = await getDatabase();
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(attendance_records)');
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has('classId')) {
    await db.execAsync(
      `ALTER TABLE attendance_records ADD COLUMN classId TEXT NOT NULL DEFAULT '${DEFAULT_CLASS_ID}'`
    );
    await db.execAsync(`
      UPDATE attendance_records
      SET classId = COALESCE(
        (SELECT classId FROM students WHERE students.id = attendance_records.studentId),
        '${DEFAULT_CLASS_ID}'
      )
    `);
  }
}
