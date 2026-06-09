import { getDatabase } from './database';
import { MonthlyReportRow } from '../types';

export async function getMonthlyReportRows(
  currentMonthStart: string,
  nextMonthStart: string,
  previousMonthStart: string,
  classId?: string
) {
  const db = await getDatabase();

  const params = [
    currentMonthStart,
    nextMonthStart,
    previousMonthStart,
    currentMonthStart,
    previousMonthStart,
    nextMonthStart,
  ];

  if (classId) {
    params.push(classId);
  }

  return db.getAllAsync<MonthlyReportRow>(
    `
    SELECT
      s.id AS studentId,
      s.rollNumber,
      s.name,
      COALESCE(SUM(CASE WHEN a.status = 'present' AND a.date >= ? AND a.date < ? THEN 1 ELSE 0 END), 0) AS currentMonthPresent,
      COALESCE(SUM(CASE WHEN a.status = 'present' AND a.date >= ? AND a.date < ? THEN 1 ELSE 0 END), 0) AS previousMonthPresent,
      COALESCE(SUM(CASE WHEN a.status = 'present' AND a.date >= ? AND a.date < ? THEN 1 ELSE 0 END), 0) AS totalOverallAttendance,
      COALESCE(SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END), 0) AS totalAbsences
    FROM students s
    LEFT JOIN attendance_records a ON a.studentId = s.id
    WHERE s.isActive = 1
      ${classId ? 'AND s.classId = ?' : ''}
    GROUP BY s.id
    ORDER BY CAST(s.rollNumber AS INTEGER), s.rollNumber
    `,
    params
  );
}
