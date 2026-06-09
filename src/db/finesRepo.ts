import { getDatabase } from './database';
import { LedgerEntry, LedgerEntryInput } from '../types';
import { createId } from '../utils/id';

export interface FineBalanceRow {
  studentId: string;
  studentCode: string;
  rollNumber: string;
  name: string;
  balance: number;
}

export async function getLedgerForStudent(studentId: string) {
  const db = await getDatabase();

  return db.getAllAsync<LedgerEntry>(
    'SELECT * FROM ledger_entries WHERE studentId = ? ORDER BY createdAt DESC',
    [studentId]
  );
}

export async function getFineBalances(classId?: string) {
  const db = await getDatabase();

  return db.getAllAsync<FineBalanceRow>(
    `
    SELECT
      s.id AS studentId,
      s.studentCode,
      s.rollNumber,
      s.name,
      COALESCE(SUM(CASE WHEN l.type = 'fine' THEN l.amount ELSE -l.amount END), 0) AS balance
    FROM students s
    LEFT JOIN ledger_entries l ON l.studentId = s.id
    WHERE s.isActive = 1
      ${classId ? 'AND s.classId = ?' : ''}
    GROUP BY s.id
    ORDER BY balance DESC, CAST(s.rollNumber AS INTEGER), s.rollNumber
    `,
    classId ? [classId] : []
  );
}

export interface FineMonthTotals {
  totalFines: number;
  totalPayments: number;
}

export interface FineMonthEntry {
  id: string;
  studentName: string;
  rollNumber: string;
  type: 'fine' | 'payment';
  amount: number;
  reason: string;
  createdAt: string;
}

export async function getFineMonthTotals(monthStart: string, nextMonthStart: string, classId?: string) {
  const db = await getDatabase();

  const row = await db.getFirstAsync<FineMonthTotals>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'fine' THEN amount ELSE 0 END), 0) AS totalFines,
      COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS totalPayments
    FROM ledger_entries
    INNER JOIN students s ON s.id = ledger_entries.studentId
    WHERE ledger_entries.createdAt >= ? AND ledger_entries.createdAt < ?
      ${classId ? 'AND s.classId = ?' : ''}
    `,
    classId ? [monthStart, nextMonthStart, classId] : [monthStart, nextMonthStart]
  );

  return row ?? { totalFines: 0, totalPayments: 0 };
}

export async function getFineMonthEntries(monthStart: string, nextMonthStart: string, classId?: string) {
  const db = await getDatabase();

  return db.getAllAsync<FineMonthEntry>(
    `
    SELECT
      l.id,
      s.name AS studentName,
      s.rollNumber,
      l.type,
      l.amount,
      l.reason,
      l.createdAt
    FROM ledger_entries l
    INNER JOIN students s ON s.id = l.studentId
    WHERE l.createdAt >= ? AND l.createdAt < ?
      ${classId ? 'AND s.classId = ?' : ''}
    ORDER BY l.createdAt DESC
    `,
    classId ? [monthStart, nextMonthStart, classId] : [monthStart, nextMonthStart]
  );
}

export async function addLedgerEntry(input: LedgerEntryInput) {
  const db = await getDatabase();

  await db.runAsync(
    `
    INSERT INTO ledger_entries (id, studentId, type, amount, reason, sourceAttendanceId, createdAt)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
    `,
    [
      createId(input.type === 'fine' ? 'fine' : 'pay'),
      input.studentId,
      input.type,
      input.amount,
      input.reason.trim(),
      new Date().toISOString(),
    ]
  );
}
