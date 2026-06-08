export type AttendanceStatus = 'present' | 'absent' | 'leave';

export type AttendanceSession = 'morning' | 'afternoon' | 'single';

export type LedgerEntryType = 'fine' | 'payment';

export interface Student {
  id: string;
  studentCode: string;
  rollNumber: string;
  name: string;
  fatherName: string;
  address: string;
  imageUri?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInput {
  studentCode: string;
  rollNumber: string;
  name: string;
  fatherName: string;
  address: string;
  imageUri?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  session: AttendanceSession;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceInput {
  studentId: string;
  date: string;
  session: AttendanceSession;
  status: AttendanceStatus;
}

export interface LedgerEntry {
  id: string;
  studentId: string;
  type: LedgerEntryType;
  amount: number;
  reason: string;
  sourceAttendanceId?: string;
  createdAt: string;
}

export interface LedgerEntryInput {
  studentId: string;
  type: LedgerEntryType;
  amount: number;
  reason: string;
}

export interface MonthlyReportRow {
  studentId: string;
  rollNumber: string;
  name: string;
  currentMonthPresent: number;
  previousMonthPresent: number;
  totalOverallAttendance: number;
  totalAbsences: number;
}
