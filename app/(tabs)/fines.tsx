import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { colors } from '../../src/constants/colors';
import { addLedgerEntry, FineBalanceRow, getFineBalances, getLedgerForStudent } from '../../src/db/finesRepo';
import { LedgerEntry } from '../../src/types';
import { exportCsv } from '../../src/utils/csvExport';

type LedgerAction = 'fine' | 'payment';

export default function FinesScreen() {
  const [balances, setBalances] = useState<FineBalanceRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<FineBalanceRow | null>(null);
  const [statement, setStatement] = useState<LedgerEntry[]>([]);
  const [actionMode, setActionMode] = useState<LedgerAction | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadBalances = useCallback(async () => {
    const rows = await getFineBalances();
    setBalances(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalances().catch((error) => {
        console.error('Failed to load fine balances', error);
      });
    }, [loadBalances])
  );

  const openStatement = async (student: FineBalanceRow) => {
    const rows = await getLedgerForStudent(student.studentId);
    setSelectedStudent(student);
    setStatement(rows);
  };

  const closeStatement = () => {
    setSelectedStudent(null);
    setStatement([]);
    closeActionModal();
  };

  const openActionModal = (mode: LedgerAction) => {
    setActionMode(mode);
    setAmount('');
    setReason(mode === 'payment' ? 'Payment collected' : '');
  };

  const closeActionModal = () => {
    setActionMode(null);
    setAmount('');
    setReason('');
  };

  const submitLedgerAction = async () => {
    if (!selectedStudent || !actionMode) {
      return;
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than 0.');
      return;
    }

    if (actionMode === 'payment' && parsedAmount > selectedStudent.balance) {
      Alert.alert('Payment too high', 'Payment cannot be greater than the current outstanding balance.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Reason required', actionMode === 'fine' ? 'Please enter a fine reason.' : 'Please enter a payment note.');
      return;
    }

    try {
      setIsSaving(true);
      await addLedgerEntry({
        studentId: selectedStudent.studentId,
        type: actionMode,
        amount: parsedAmount,
        reason,
      });

      const [balanceRows, ledgerRows] = await Promise.all([
        getFineBalances(),
        getLedgerForStudent(selectedStudent.studentId),
      ]);
      setBalances(balanceRows);
      setStatement(ledgerRows);
      setSelectedStudent(balanceRows.find((row) => row.studentId === selectedStudent.studentId) ?? selectedStudent);
      closeActionModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save ledger entry.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalOutstanding = balances.reduce((sum, row) => sum + row.balance, 0);

  const exportBalances = async () => {
    if (balances.length === 0) {
      Alert.alert('No data', 'There are no fine balances to export.');
      return;
    }

    try {
      await exportCsv(`fine-balances-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['Student Name', 'Student ID', 'Roll Number', 'Outstanding Balance'],
        ...balances.map((student) => [
          student.name,
          student.studentCode,
          student.rollNumber,
          `${student.balance}`,
        ]),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export fines.';
      Alert.alert('Export failed', message);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fines Ledger</Text>
            <Text style={styles.subtitle}>Outstanding balances and statements</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.exportButton} onPress={exportBalances}>
              <Feather name="share-2" color={colors.primary} size={20} />
            </Pressable>
            <View style={styles.totalPill}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalOutstanding)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" color={colors.textMuted} size={22} />
          <Text style={styles.searchPlaceholder}>Tap a student to view statement</Text>
        </View>

        {balances.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="credit-card" color={colors.textMuted} size={30} />
            <Text style={styles.emptyTitle}>No ledger yet</Text>
            <Text style={styles.emptyText}>Absent marks will create automatic fines here.</Text>
          </View>
        ) : (
          balances.map((student) => (
            <Pressable key={student.studentId} style={styles.balanceCard} onPress={() => openStatement(student)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  ID {student.studentCode} | Roll {student.rollNumber}
                </Text>
              </View>
              <View style={styles.balanceBlock}>
                <Text style={[styles.balanceValue, student.balance > 0 ? styles.dangerText : styles.successText]}>
                  {formatCurrency(student.balance)}
                </Text>
                <Text style={styles.balanceLabel}>{student.balance > 0 ? 'Outstanding' : 'Clear'}</Text>
              </View>
              <Feather name="chevron-right" color={colors.textMuted} size={20} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={!!selectedStudent} onRequestClose={closeStatement}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetScrim} onPress={closeStatement} />
          <View style={styles.sheet}>
            {selectedStudent ? (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(selectedStudent.name)}</Text>
                  </View>
                  <View style={styles.sheetTitleBlock}>
                    <Text style={styles.sheetTitle}>{selectedStudent.name}</Text>
                    <Text style={styles.studentMeta}>Roll {selectedStudent.rollNumber}</Text>
                  </View>
                  <Pressable style={styles.closeButton} onPress={closeStatement}>
                    <Feather name="x" color={colors.textSecondary} size={24} />
                  </Pressable>
                </View>

                <Text style={styles.sectionLabel}>Statement History</Text>

                <ScrollView style={styles.statementList} contentContainerStyle={styles.statementContent}>
                  {statement.length === 0 ? (
                    <View style={styles.statementEmpty}>
                      <Text style={styles.emptyText}>No fines or payments recorded.</Text>
                    </View>
                  ) : (
                    statement.map((entry) => (
                      <View key={entry.id} style={styles.statementItem}>
                        <View
                          style={[
                            styles.timelineDot,
                            entry.type === 'fine' ? styles.timelineFine : styles.timelinePayment,
                          ]}
                        />
                        <View style={styles.statementText}>
                          <Text style={styles.statementTitle}>{entry.reason}</Text>
                          <Text style={styles.statementMeta}>{formatDate(entry.createdAt)}</Text>
                        </View>
                        <Text style={[styles.statementAmount, entry.type === 'fine' ? styles.dangerText : styles.successText]}>
                          {entry.type === 'fine' ? '+' : '-'}
                          {formatCurrency(entry.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                <View style={styles.sheetFooter}>
                  <Text style={styles.currentBalanceLabel}>Current Balance</Text>
                  <Text style={[styles.currentBalance, selectedStudent.balance > 0 ? styles.dangerText : styles.successText]}>
                    {formatCurrency(selectedStudent.balance)}
                  </Text>
                </View>

                <View style={styles.sheetActions}>
                  <Pressable style={styles.outlineDangerButton} onPress={() => openActionModal('fine')}>
                    <Feather name="plus" color={colors.surface} size={22} />
                    <Text style={styles.outlineDangerText}>Add Fine</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.settleButton, selectedStudent.balance <= 0 ? styles.disabledButton : null]}
                    onPress={() => openActionModal('payment')}
                    disabled={selectedStudent.balance <= 0}
                  >
                    <Feather name="credit-card" color={colors.surface} size={22} />
                    <Text style={styles.settleButtonText}>Collect Payment</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={!!actionMode} onRequestClose={closeActionModal}>
        <KeyboardAvoidingView
          style={styles.actionBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>{actionMode === 'fine' ? 'Add Fine' : 'Collect Payment'}</Text>
              <Pressable style={styles.closeButton} onPress={closeActionModal}>
                <Feather name="x" color={colors.textSecondary} size={22} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>{actionMode === 'fine' ? 'Reason' : 'Payment Note'}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder={actionMode === 'fine' ? 'e.g. Late arrival' : 'e.g. Cash received'}
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {actionMode === 'payment' && selectedStudent ? (
              <Text style={styles.helperText}>Outstanding balance: {formatCurrency(selectedStudent.balance)}</Text>
            ) : null}

            <View style={styles.actionButtons}>
              <Pressable style={styles.cancelButton} onPress={closeActionModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  actionMode === 'fine' ? styles.saveFineButton : styles.savePaymentButton,
                  isSaving ? styles.disabledButton : null,
                ]}
                onPress={submitLedgerAction}
                disabled={isSaving}
              >
                <Text style={styles.saveActionText}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatCurrency(value: number) {
  return `Rs. ${Math.abs(value).toFixed(0)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 116,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  totalPill: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  headerActions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  totalValue: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  searchPlaceholder: {
    color: colors.textMuted,
    fontSize: 15,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  studentMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  balanceBlock: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dangerText: {
    color: colors.danger,
  },
  successText: {
    color: colors.success,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
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
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetScrim: {
    backgroundColor: colors.overlay,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '82%',
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.divider,
    borderRadius: 999,
    height: 6,
    marginTop: 14,
    width: 58,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: 18,
  },
  sheetTitleBlock: {
    flex: 1,
    marginLeft: 14,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    textTransform: 'uppercase',
  },
  statementList: {
    maxHeight: 260,
  },
  statementContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  statementEmpty: {
    paddingVertical: 18,
  },
  statementItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: 82,
    paddingBottom: 18,
  },
  timelineDot: {
    borderColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    marginRight: 12,
    marginTop: 4,
    width: 16,
  },
  timelineFine: {
    backgroundColor: colors.danger,
  },
  timelinePayment: {
    backgroundColor: colors.success,
  },
  statementText: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statementTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  statementMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  statementAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 12,
  },
  sheetFooter: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  currentBalanceLabel: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  currentBalance: {
    fontSize: 32,
    fontWeight: '800',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  outlineDangerButton: {
    alignItems: 'center',
    backgroundColor: '#5F6064',
    borderRadius: 32,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
  },
  outlineDangerText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  settleButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 32,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
  },
  settleButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  actionBackdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 18,
    width: '100%',
  },
  actionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  actionButtons: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 18,
    paddingTop: 14,
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  saveFineButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 18,
  },
  savePaymentButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 18,
  },
  saveActionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
});
