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

export async function getFineBalances() {
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
    GROUP BY s.id
    ORDER BY balance DESC, CAST(s.rollNumber AS INTEGER), s.rollNumber
    `
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
