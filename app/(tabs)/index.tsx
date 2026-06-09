import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { SegmentedControl } from '../../src/components/SegmentedControl';
import { colors } from '../../src/constants/colors';
import { DEFAULT_ABSENCE_FINE } from '../../src/constants/config';
import { getAttendanceForDate, saveDailyAttendance } from '../../src/db/attendanceRepo';
import { getActiveStudents } from '../../src/db/studentsRepo';
import { AttendanceSession, AttendanceStatus, Student } from '../../src/types';
import {
  formatDisplayDate,
  fromDateKey,
  getSessionLabel,
  getSessionsForDate,
  isBeforeDateKey,
  toDateKey,
} from '../../src/utils/dateUtils';

type AttendanceSelections = Record<string, Partial<Record<AttendanceSession, AttendanceStatus>>>;

const statusOptions = [
  {
    label: 'Present',
    value: 'present',
    activeBackgroundColor: colors.success,
    activeTextColor: colors.surface,
  },
  {
    label: 'Absent',
    value: 'absent',
    activeBackgroundColor: colors.danger,
    activeTextColor: colors.surface,
  },
  {
    label: 'Leave',
    value: 'leave',
    activeBackgroundColor: colors.warning,
    activeTextColor: colors.surface,
  },
] satisfies {
  label: string;
  value: AttendanceStatus;
  activeBackgroundColor: string;
  activeTextColor: string;
}[];

export default function AttendanceScreen() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const selectedDateObject = useMemo(() => fromDateKey(selectedDate), [selectedDate]);
  const sessions = useMemo(() => getSessionsForDate(selectedDateObject), [selectedDateObject]);
  const isPastDate = isBeforeDateKey(selectedDate, todayKey);

  const [students, setStudents] = useState<Student[]>([]);
  const [selections, setSelections] = useState<AttendanceSelections>({});
  const [hasSavedAttendance, setHasSavedAttendance] = useState(false);
  const [isPastEditMode, setIsPastEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditable = !isPastDate || isPastEditMode;

  const loadAttendance = useCallback(async () => {
    const [studentRows, attendanceRows] = await Promise.all([
      getActiveStudents(),
      getAttendanceForDate(selectedDate),
    ]);

    const nextSelections: AttendanceSelections = {};

    for (const student of studentRows) {
      nextSelections[student.id] = {};

      for (const session of sessions) {
        nextSelections[student.id][session] = 'present';
      }
    }

    for (const record of attendanceRows) {
      if (nextSelections[record.studentId] && sessions.includes(record.session)) {
        nextSelections[record.studentId][record.session] = record.status;
      }
    }

    setStudents(studentRows);
    setSelections(nextSelections);
    setHasSavedAttendance(attendanceRows.length > 0);
  }, [selectedDate, sessions]);

  useFocusEffect(
    useCallback(() => {
      loadAttendance().catch((error) => {
        console.error('Failed to load attendance', error);
      });
    }, [loadAttendance])
  );

  const selectDate = (day: DateData) => {
    if (day.dateString > todayKey) {
      return;
    }

    setSelectedDate(day.dateString);
    setIsPastEditMode(false);
  };

  const confirmPastEdit = () => {
    Alert.alert(
      hasSavedAttendance ? 'Edit past attendance?' : 'Mark past attendance?',
      hasSavedAttendance
        ? 'You can correct late, leave, or forgotten marks. Fine ledger entries will update if absence status changes.'
        : 'No attendance is saved for this date. You can add it now.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => setIsPastEditMode(true) },
      ]
    );
  };

  const updateStatus = (studentId: string, session: AttendanceSession, status: AttendanceStatus) => {
    if (!isEditable) {
      return;
    }

    setSelections((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [session]: status,
      },
    }));
  };

  const saveAttendance = async () => {
    const records = students.flatMap((student) =>
      sessions.map((session) => ({
        studentId: student.id,
        date: selectedDate,
        session,
        status: selections[student.id]?.[session] ?? 'present',
      }))
    );

    try {
      setIsSaving(true);
      await saveDailyAttendance(records);
      await loadAttendance();
      setIsPastEditMode(false);
      Alert.alert('Attendance saved', 'Attendance has been saved successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save attendance.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  const absentCount = students.reduce((count, student) => {
    return (
      count +
      sessions.filter((session) => selections[student.id]?.[session] === 'absent').length
    );
  }, 0);

  const markedDates = useMemo(
    () => ({
      [selectedDate]: {
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: colors.surface,
      },
    }),
    [selectedDate]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.calendarCard}>
        <Calendar
          current={selectedDate}
          maxDate={todayKey}
          markedDates={markedDates}
          onDayPress={selectDate}
          hideExtraDays
          disableAllTouchEventsForDisabledDays
          theme={{
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.surface,
            todayTextColor: colors.success,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.border,
            arrowColor: colors.primary,
            monthTextColor: colors.textPrimary,
            textMonthFontWeight: '800',
            textDayFontWeight: '700',
            textDayHeaderFontWeight: '800',
          }}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{formatDisplayDate(selectedDateObject)}</Text>
        <Text style={styles.dateText}>
          {isEditable ? 'Editable attendance register' : 'History view | Tap edit to correct this date'}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{students.length}</Text>
          <Text style={styles.summaryLabel}>Students</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{sessions.length}</Text>
          <Text style={styles.summaryLabel}>Sessions</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, absentCount > 0 ? styles.dangerText : null]}>
            {absentCount}
          </Text>
          <Text style={styles.summaryLabel}>Absences</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Feather name={isEditable ? 'info' : 'clock'} color={colors.primary} size={18} />
        <Text style={styles.noticeText}>
          {isEditable
            ? `Absent marks automatically add a Rs. ${DEFAULT_ABSENCE_FINE} fine per session.`
            : hasSavedAttendance
              ? 'This is saved attendance history. Use edit only when a correction is needed.'
              : 'No attendance is saved for this date yet. Use edit to add past attendance.'}
        </Text>
      </View>

      {isPastDate ? (
        <Pressable style={styles.editPastButton} onPress={confirmPastEdit}>
          <Feather name={hasSavedAttendance ? 'edit-2' : 'plus-circle'} color={colors.primary} size={18} />
          <Text style={styles.editPastButtonText}>
            {hasSavedAttendance ? 'Edit Past Attendance' : 'Mark Past Attendance'}
          </Text>
        </Pressable>
      ) : null}

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" color={colors.textMuted} size={30} />
          <Text style={styles.emptyTitle}>No active students</Text>
          <Text style={styles.emptyText}>Add students first, then return here to mark attendance.</Text>
        </View>
      ) : !isEditable && !hasSavedAttendance ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" color={colors.textMuted} size={30} />
          <Text style={styles.emptyTitle}>No attendance saved</Text>
          <Text style={styles.emptyText}>This date has no saved attendance record yet.</Text>
        </View>
      ) : (
        students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              {student.imageUri ? (
                <Image source={{ uri: student.imageUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{student.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  ID {student.studentCode} | Roll {student.rollNumber}
                </Text>
              </View>
              <View style={[styles.studentStatusDot, { backgroundColor: getStudentStatusColor(selections[student.id], sessions) }]} />
            </View>

            {sessions.map((session) => (
              <View key={session} style={styles.sessionBlock}>
                <Text style={styles.sessionLabel}>{getSessionLabel(session)}</Text>
                {isEditable ? (
                  <SegmentedControl
                    options={statusOptions}
                    value={selections[student.id]?.[session] ?? 'present'}
                    onChange={(status) => updateStatus(student.id, session, status)}
                  />
                ) : (
                  <StatusBadge status={selections[student.id]?.[session] ?? 'present'} />
                )}
              </View>
            ))}
          </View>
        ))
      )}

      {students.length > 0 && isEditable ? (
        <Pressable
          style={[styles.saveButton, isSaving ? styles.disabledButton : null]}
          onPress={saveAttendance}
          disabled={isSaving}
        >
          <Feather name="save" color={colors.surface} size={18} />
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Attendance'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const stylesByStatus = {
    present: { backgroundColor: colors.successSoft, color: colors.success, label: 'Present' },
    absent: { backgroundColor: colors.dangerSoft, color: colors.danger, label: 'Absent' },
    leave: { backgroundColor: colors.surfaceMuted, color: colors.primary, label: 'Leave' },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: stylesByStatus.backgroundColor }]}>
      <Text style={[styles.statusBadgeText, { color: stylesByStatus.color }]}>{stylesByStatus.label}</Text>
    </View>
  );
}

function getStudentStatusColor(
  studentSelections: Partial<Record<AttendanceSession, AttendanceStatus>> | undefined,
  sessions: AttendanceSession[]
) {
  if (sessions.some((session) => studentSelections?.[session] === 'absent')) {
    return colors.danger;
  }

  if (sessions.some((session) => studentSelections?.[session] === 'leave')) {
    return colors.border;
  }

  return colors.success;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 18,
    paddingBottom: 128,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  summaryItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dangerText: {
    color: colors.danger,
  },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderColor: '#F6C785',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    padding: 12,
  },
  noticeText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  editPastButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
    minHeight: 48,
  },
  editPastButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    padding: 30,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  studentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 19,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  studentMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  studentStatusDot: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  sessionBlock: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.divider,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 6,
  },
  sessionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 10,
    minHeight: 42,
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  saveButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 32,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 64,
    paddingHorizontal: 34,
    shadowColor: '#000000',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});
