import { DEFAULT_CLASS_ID, getDatabase } from './database';
import { ClassRoom, ClassRoomInput } from '../types';
import { createId } from '../utils/id';

type ClassRoomRow = Omit<ClassRoom, 'isActive'> & { isActive: number };

export interface ClassRoomSummary extends ClassRoom {
  studentCount: number;
}

type ClassRoomSummaryRow = ClassRoomRow & { studentCount: number };

function mapClassRoom(row: ClassRoomRow): ClassRoom {
  return {
    ...row,
    isActive: row.isActive === 1,
  };
}

export async function getActiveClasses() {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ClassRoomSummaryRow>(
    `
    SELECT
      c.*,
      COUNT(s.id) AS studentCount
    FROM classes c
    LEFT JOIN students s ON s.classId = c.id AND s.isActive = 1
    WHERE c.isActive = 1
    GROUP BY c.id
    ORDER BY CASE WHEN c.id = ? THEN 0 ELSE 1 END, c.name
    `,
    [DEFAULT_CLASS_ID]
  );

  return rows.map((row) => ({
    ...mapClassRoom(row),
    studentCount: row.studentCount,
  }));
}

export async function createClassRoom(input: ClassRoomInput) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = createId('cls');

  await db.runAsync(
    `
    INSERT INTO classes (id, name, subject, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, 1, ?, ?)
    `,
    [id, input.name.trim(), input.subject.trim(), now, now]
  );

  return id;
}

export async function updateClassRoom(id: string, input: ClassRoomInput) {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE classes
    SET name = ?, subject = ?, updatedAt = ?
    WHERE id = ?
    `,
    [input.name.trim(), input.subject.trim(), new Date().toISOString(), id]
  );
}

export async function softDeleteClassRoom(id: string) {
  if (id === DEFAULT_CLASS_ID) {
    throw new Error('Default class cannot be deleted.');
  }

  const db = await getDatabase();
  const studentCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM students WHERE classId = ? AND isActive = 1',
    [id]
  );

  if ((studentCount?.count ?? 0) > 0) {
    throw new Error('Move or remove students from this class before deleting it.');
  }

  await db.runAsync('UPDATE classes SET isActive = 0, updatedAt = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}
