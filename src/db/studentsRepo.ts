import { getDatabase } from './database';
import { Student, StudentInput } from '../types';
import { createId } from '../utils/id';

type StudentRow = Omit<Student, 'isActive'> & { isActive: number };

function mapStudent(row: StudentRow): Student {
  return {
    ...row,
    isActive: row.isActive === 1,
  };
}

export async function getActiveStudents() {
  const db = await getDatabase();

  const rows = await db.getAllAsync<StudentRow>(
    'SELECT * FROM students WHERE isActive = 1 ORDER BY CAST(rollNumber AS INTEGER), rollNumber, name'
  );

  return rows.map(mapStudent);
}

export async function createStudent(input: StudentInput) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = createId('stu');

  await db.runAsync(
    `
    INSERT INTO students (
      id, studentCode, rollNumber, name, fatherName, address, imageUri, isActive, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `,
    [
      id,
      input.studentCode.trim(),
      input.rollNumber.trim(),
      input.name.trim(),
      input.fatherName.trim(),
      input.address.trim(),
      input.imageUri ?? null,
      now,
      now,
    ]
  );

  return id;
}

export async function updateStudent(id: string, input: StudentInput) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
    UPDATE students
    SET studentCode = ?,
        rollNumber = ?,
        name = ?,
        fatherName = ?,
        address = ?,
        imageUri = ?,
        updatedAt = ?
    WHERE id = ?
    `,
    [
      input.studentCode.trim(),
      input.rollNumber.trim(),
      input.name.trim(),
      input.fatherName.trim(),
      input.address.trim(),
      input.imageUri ?? null,
      now,
      id,
    ]
  );
}

export async function softDeleteStudent(id: string) {
  const db = await getDatabase();

  await db.runAsync('UPDATE students SET isActive = 0, updatedAt = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}
