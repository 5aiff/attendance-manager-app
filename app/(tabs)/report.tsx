import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { colors } from '../../src/constants/colors';
import { getMonthlyReportRows } from '../../src/db/reportsRepo';
import { MonthlyReportRow } from '../../src/types';
import { exportCsv } from '../../src/utils/csvExport';
import { getMonthBounds } from '../../src/utils/dateUtils';

export default function ReportScreen() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [rows, setRows] = useState<MonthlyReportRow[]>([]);

  const bounds = useMemo(() => getMonthBounds(selectedMonth), [selectedMonth]);

  const loadReport = useCallback(async () => {
    const reportRows = await getMonthlyReportRows(
      bounds.currentMonthStart,
      bounds.nextMonthStart,
      bounds.previousMonthStart
    );
    setRows(reportRows);
  }, [bounds]);

  useFocusEffect(
    useCallback(() => {
      loadReport().catch((error) => {
        console.error('Failed to load report', error);
      });
    }, [loadReport])
  );

  const totalAbsences = rows.reduce((sum, row) => sum + row.totalAbsences, 0);
  const totalPresent = rows.reduce((sum, row) => sum + row.currentMonthPresent, 0);

  const changeMonth = (offset: number) => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const exportReport = async () => {
    if (rows.length === 0) {
      Alert.alert('No data', 'There is no report data to export for this month.');
      return;
    }

    try {
      await exportCsv(`monthly-report-${toFileMonth(selectedMonth)}.csv`, [
        ['Student Name', 'Roll Number', 'Current Month Present', 'Previous Month Present', 'Total Attendance', 'Total Absences'],
        ...rows.map((row) => [
          row.name,
          row.rollNumber,
          `${row.currentMonthPresent}`,
          `${row.previousMonthPresent}`,
          `${row.totalOverallAttendance}`,
          `${row.totalAbsences}`,
        ]),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export report.';
      Alert.alert('Export failed', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Pressable style={styles.filterButton} onPress={exportReport}>
          <Feather name="share-2" color={colors.primary} size={22} />
        </Pressable>
      </View>

      <View style={styles.monthSelector}>
        <Pressable style={styles.monthButton} onPress={() => changeMonth(-1)}>
          <Feather name="chevron-left" color={colors.primary} size={22} />
        </Pressable>
        <Text style={styles.monthText}>{formatMonth(selectedMonth)}</Text>
        <Pressable style={styles.monthButton} onPress={() => changeMonth(1)}>
          <Feather name="chevron-right" color={colors.primary} size={22} />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current Present</Text>
          <Text style={styles.summaryValue}>{totalPresent}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Absences</Text>
          <Text style={[styles.summaryValue, styles.dangerText]}>{totalAbsences}</Text>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" color={colors.textMuted} size={30} />
          <Text style={styles.emptyTitle}>No report data</Text>
          <Text style={styles.emptyText}>Add students and save attendance to generate this report.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScrollContent}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.columnHeader, styles.nameColumnHeader]}>Student Name</Text>
              <Text style={styles.columnHeader}>Current</Text>
              <Text style={styles.columnHeader}>Previous</Text>
              <Text style={styles.columnHeader}>Total</Text>
              <Text style={styles.columnHeader}>Absent</Text>
            </View>

            {rows.map((row) => (
              <View key={row.studentId} style={styles.reportRow}>
                <View style={styles.nameColumn}>
                  <View style={styles.initialsBadge}>
                    <Text style={styles.initialsText}>{getInitials(row.name)}</Text>
                  </View>
                  <View style={styles.studentTextBlock}>
                    <Text style={styles.studentName} numberOfLines={2}>
                      {row.name}
                    </Text>
                    <Text style={styles.studentMeta}>Roll {row.rollNumber}</Text>
                  </View>
                </View>
                <Text style={styles.metric}>{row.currentMonthPresent}</Text>
                <Text style={styles.metric}>{row.previousMonthPresent}</Text>
                <Text style={styles.metric}>{row.totalOverallAttendance}</Text>
                <Text style={[styles.metric, row.totalAbsences > 0 ? styles.dangerText : null]}>
                  {row.totalAbsences}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

function formatMonth(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function toFileMonth(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 16,
    paddingBottom: 116,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  monthSelector: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    minHeight: 64,
    paddingHorizontal: 12,
  },
  monthButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 10,
  },
  dangerText: {
    color: colors.danger,
  },
  tableScrollContent: {
    paddingBottom: 8,
  },
  table: {
    backgroundColor: colors.surface,
    minWidth: 660,
  },
  tableHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingBottom: 10,
  },
  columnHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    width: 90,
  },
  nameColumnHeader: {
    textAlign: 'left',
    width: 300,
  },
  nameColumn: {
    alignItems: 'center',
    flexDirection: 'row',
    width: 300,
  },
  reportRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 76,
    paddingVertical: 12,
  },
  initialsBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  initialsText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  studentTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  studentMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  metric: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 8,
    textAlign: 'center',
    width: 90,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
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
});
