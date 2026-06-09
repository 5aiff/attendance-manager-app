import { getDatabase } from './database';
import { AttendanceInput, AttendanceRecord } from '../types';
import { getDailyFineAmount } from '../storage/settingsStorage';
import { getSessionLabel } from '../utils/dateUtils';
import { createId } from '../utils/id';

export async function getAttendanceForMonth(monthStart: string, nextMonthStart: string) {
  const db = await getDatabase();

  return db.getAllAsync<AttendanceRecord>(
    'SELECT * FROM attendance_records WHERE date >= ? AND date < ? ORDER BY date DESC, session ASC',
    [monthStart, nextMonthStart]
  );
}

export async function getAttendanceForDate(date: string, classId?: string) {
  const db = await getDatabase();

  return classId
    ? db.getAllAsync<AttendanceRecord>(
        'SELECT * FROM attendance_records WHERE date = ? AND classId = ? ORDER BY session ASC',
        [date, classId]
      )
    : db.getAllAsync<AttendanceRecord>(
        'SELECT * FROM attendance_records WHERE date = ? ORDER BY session ASC',
        [date]
      );
}

export async function saveDailyAttendance(records: AttendanceInput[]) {
  const db = await getDatabase();

  for (const record of records) {
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync<AttendanceRecord>(
      'SELECT * FROM attendance_records WHERE studentId = ? AND date = ? AND session = ?',
      [record.studentId, record.date, record.session]
    );

    const attendanceId = existing?.id ?? createId('att');

    if (existing) {
      await db.runAsync(
        'UPDATE attendance_records SET classId = ?, status = ?, updatedAt = ? WHERE id = ?',
        [record.classId, record.status, now, attendanceId]
      );
    } else {
      await db.runAsync(
        `
        INSERT INTO attendance_records (id, studentId, classId, date, session, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [attendanceId, record.studentId, record.classId, record.date, record.session, record.status, now, now]
      );
    }

    if (record.status === 'absent') {
      await ensureAbsenceFine(record.studentId, attendanceId, record.session);
    } else {
      await removeAbsenceFine(attendanceId);
    }
  }
}

async function ensureAbsenceFine(studentId: string, attendanceId: string, session: AttendanceInput['session']) {
  const db = await getDatabase();
  const dailyFineAmount = await getDailyFineAmount();
  const existingFine = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM ledger_entries WHERE sourceAttendanceId = ? AND type = 'fine'",
    [attendanceId]
  );

  if (existingFine) {
    return;
  }

  await db.runAsync(
    `
    INSERT INTO ledger_entries (id, studentId, type, amount, reason, sourceAttendanceId, createdAt)
    VALUES (?, ?, 'fine', ?, ?, ?, ?)
    `,
    [
      createId('fine'),
      studentId,
      dailyFineAmount,
      `Automatic absence fine - ${getSessionLabel(session)}`,
      attendanceId,
      new Date().toISOString(),
    ]
  );
}

async function removeAbsenceFine(attendanceId: string) {
  const db = await getDatabase();

  await db.runAsync(
    "DELETE FROM ledger_entries WHERE sourceAttendanceId = ? AND type = 'fine'",
    [attendanceId]
  );
}
