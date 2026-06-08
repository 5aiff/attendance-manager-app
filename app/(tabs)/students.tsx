import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import Feather from '@expo/vector-icons/Feather';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { colors } from '../../src/constants/colors';
import { createStudent, getActiveStudents, softDeleteStudent, updateStudent } from '../../src/db/studentsRepo';
import { Student, StudentInput } from '../../src/types';

type StudentFormState = StudentInput;

const emptyForm: StudentFormState = {
  studentCode: '',
  rollNumber: '',
  name: '',
  fatherName: '',
  address: '',
  imageUri: undefined,
};

export default function StudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStudents = useCallback(async () => {
    const rows = await getActiveStudents();
    setStudents(rows);
  }, []);

  useEffect(() => {
    loadStudents().catch((error) => {
      console.error('Failed to load students', error);
    });
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) =>
      [student.studentCode, student.rollNumber, student.name, student.fatherName, student.address]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, students]);

  const updateField = (field: keyof StudentFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openNewStudent = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalVisible(false);
  };

  const chooseImageSource = () => {
    Alert.alert('Student Image', 'Choose an image source.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickImageFromGallery },
    ]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take a student photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    await savePickedImage(result);
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow gallery access to select a student image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    await savePickedImage(result);
  };

  const savePickedImage = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    const imageUri = await copyImageToAppStorage(result.assets[0].uri);
    setForm((current) => ({ ...current, imageUri }));
  };

  const saveStudent = async () => {
    if (!form.studentCode.trim() || !form.rollNumber.trim() || !form.name.trim()) {
      Alert.alert('Missing details', 'Student ID, roll number, and name are required.');
      return;
    }

    try {
      setIsSaving(true);

      if (editingId) {
        await updateStudent(editingId, form);
      } else {
        await createStudent(form);
      }

      closeModal();
      await loadStudents();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save student.';
      Alert.alert('Save failed', message.includes('UNIQUE') ? 'This roll number already exists.' : message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (student: Student) => {
    setEditingId(student.id);
    setForm({
      studentCode: student.studentCode,
      rollNumber: student.rollNumber,
      name: student.name,
      fatherName: student.fatherName,
      address: student.address,
      imageUri: student.imageUri,
    });
    setIsModalVisible(true);
  };

  const confirmDelete = (student: Student) => {
    Alert.alert('Remove student?', `${student.name} will be hidden from the active roster.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await softDeleteStudent(student.id);
          if (editingId === student.id) {
            closeModal();
          }
          await loadStudents();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Roster</Text>
          <Text style={styles.subtitle}>{students.length} active students</Text>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" color={colors.textMuted} size={22} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search students..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" color={colors.textMuted} size={30} />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>
              {students.length === 0 ? 'Add your first student to begin attendance tracking.' : 'Try another search term.'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              {student.imageUri ? (
                <Image source={{ uri: student.imageUri }} style={styles.cardAvatar} />
              ) : (
                <View style={styles.cardAvatarFallback}>
                  <Text style={styles.cardAvatarText}>{getInitials(student.name)}</Text>
                  <View style={styles.statusDot} />
                </View>
              )}

              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  ID {student.studentCode} | Roll {student.rollNumber}
                </Text>
                {student.fatherName ? <Text style={styles.studentMeta}>Father: {student.fatherName}</Text> : null}
              </View>

              <View style={styles.cardActions}>
                <Pressable style={styles.iconButton} onPress={() => startEditing(student)}>
                  <Feather name="edit-2" color={colors.primary} size={18} />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={() => confirmDelete(student)}>
                  <Feather name="trash-2" color={colors.danger} size={18} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={openNewStudent}>
        <Feather name="plus" color={colors.surface} size={26} />
      </Pressable>

      <Modal animationType="fade" transparent visible={isModalVisible} onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Student' : 'Add Student'}</Text>
              <Pressable style={styles.iconButton} onPress={closeModal}>
                <Feather name="x" color={colors.textSecondary} size={20} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Pressable style={styles.imagePicker} onPress={chooseImageSource}>
                {form.imageUri ? (
                  <Image source={{ uri: form.imageUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="camera" color={colors.primary} size={24} />
                  </View>
                )}
                <Text style={styles.imagePickerText}>{form.imageUri ? 'Change Image' : 'Add Image'}</Text>
              </Pressable>

              <LabeledInput label="Student ID" value={form.studentCode} onChangeText={(value) => updateField('studentCode', value)} />
              <LabeledInput
                label="Roll Number"
                value={form.rollNumber}
                onChangeText={(value) => updateField('rollNumber', value)}
                keyboardType="number-pad"
              />
              <LabeledInput label="Full Name" value={form.name} onChangeText={(value) => updateField('name', value)} />
              <LabeledInput label="Father Name" value={form.fatherName} onChangeText={(value) => updateField('fatherName', value)} />
              <LabeledInput
                label="Address"
                value={form.address}
                onChangeText={(value) => updateField('address', value)}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSaving ? styles.disabledButton : null]}
                onPress={saveStudent}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textArea : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
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

async function copyImageToAppStorage(sourceUri: string) {
  const directory = new Directory(Paths.document, 'student-images');
  directory.create({ intermediates: true, idempotent: true });

  const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const source = new File(sourceUri);
  const destination = new File(directory, `student_${Date.now()}.${extension}`);

  source.copy(destination);
  return destination.uri;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 116,
  },
  header: {
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
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 74,
    padding: 14,
  },
  cardAvatar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  cardAvatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  cardAvatarText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '800',
  },
  statusDot: {
    backgroundColor: colors.success,
    borderColor: colors.surface,
    borderRadius: 7,
    borderWidth: 2,
    bottom: 2,
    height: 14,
    position: 'absolute',
    right: 2,
    width: 14,
  },
  studentDetails: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  studentMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 18,
    bottom: 96,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    shadowColor: colors.primary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    width: 64,
  },
  modalBackdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxHeight: '88%',
    padding: 18,
    shadowColor: colors.primary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  imagePicker: {
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 46,
    height: 92,
    width: 92,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 46,
    borderWidth: 1,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  imagePickerText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 84,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  modalActions: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
});
