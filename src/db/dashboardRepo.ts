import { getDatabase } from './database';

export interface ClassDashboardSummary {
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  monthCollected: number;
  pendingFines: number;
}

export async function getClassDashboardSummary(
  classId: string,
  date: string,
  monthStart: string,
  nextMonthStart: string
) {
  const db = await getDatabase();

  const attendance = await db.getFirstAsync<{
    presentCount: number;
    absentCount: number;
    leaveCount: number;
  }>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0) AS presentCount,
      COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0) AS absentCount,
      COALESCE(SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END), 0) AS leaveCount
    FROM attendance_records
    WHERE classId = ? AND date = ?
    `,
    [classId, date]
  );

  const ledger = await db.getFirstAsync<{ monthCollected: number; pendingFines: number }>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN l.type = 'payment' AND l.createdAt >= ? AND l.createdAt < ? THEN l.amount ELSE 0 END), 0) AS monthCollected,
      COALESCE(SUM(CASE WHEN l.type = 'fine' THEN l.amount ELSE -l.amount END), 0) AS pendingFines
    FROM students s
    LEFT JOIN ledger_entries l ON l.studentId = s.id
    WHERE s.classId = ? AND s.isActive = 1
    `,
    [monthStart, nextMonthStart, classId]
  );

  return {
    presentCount: attendance?.presentCount ?? 0,
    absentCount: attendance?.absentCount ?? 0,
    leaveCount: attendance?.leaveCount ?? 0,
    monthCollected: ledger?.monthCollected ?? 0,
    pendingFines: ledger?.pendingFines ?? 0,
  };
}
