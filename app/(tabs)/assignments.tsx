import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Task {
    id: string;
    title: string;
    subject: string;
    deadline: string;
    status: 'active' | 'completed';
    createdAt: string;
}

const TASKS_KEY = '@tasks_list';

export default function AssignmentsScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [tasks, setTasks] = useState<Task[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', subject: '', deadline: new Date() });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const slideAnim = useRef(new Animated.Value(400)).current;

    const theme = {
        bg: isDark ? '#0F172A' : '#F9FAFB',
        card: isDark ? '#1E293B' : '#FFFFFF',
        text: isDark ? '#F1F5F9' : '#111827',
        textMuted: isDark ? '#94A3B8' : '#6B7280',
        border: isDark ? '#334155' : '#E5E7EB',
        accent: '#3B82F6',
    };

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const data = await AsyncStorage.getItem(TASKS_KEY);
            setTasks(data ? JSON.parse(data) : []);
        } catch { }
    };

    const saveTasks = async (updated: Task[]) => {
        setTasks(updated);
        await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    };

    const openModal = () => {
        setForm({ title: '', subject: '', deadline: new Date() });
        setShowModal(true);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
            setShowModal(false);
        });
    };

    const handleAddTask = async () => {
        if (!form.title.trim() || !form.subject.trim()) {
            Alert.alert('Peringatan', 'Judul tugas dan mata kuliah wajib diisi.');
            return;
        }
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title: form.title.trim(),
            subject: form.subject.trim(),
            deadline: form.deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        await saveTasks([newTask, ...tasks]);
        closeModal();
    };

    const toggleComplete = async (id: string) => {
        const updated = tasks.map(t =>
            t.id === id ? { ...t, status: t.status === 'active' ? 'completed' as const : 'active' as const } : t
        );
        await saveTasks(updated);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Hapus Tugas', 'Yakin ingin menghapus tugas ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive',
                onPress: async () => {
                    const updated = tasks.filter(t => t.id !== id);
                    await saveTasks(updated);
                }
            },
        ]);
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setForm({ ...form, deadline: selectedDate });
        }
    };

    const activeTasks = tasks.filter(t => t.status === 'active');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    const renderTask = ({ item }: { item: Task }) => (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, item.status === 'completed' && styles.cardCompleted]}>
            <Pressable
                style={styles.checkButton}
                onPress={() => toggleComplete(item.id)}
            >
                <View style={[
                    styles.checkCircle,
                    { borderColor: theme.accent },
                    item.status === 'completed' && { backgroundColor: theme.accent }
                ]}>
                    {item.status === 'completed' && <Text style={styles.checkMark}>✓</Text>}
                </View>
            </Pressable>

            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.text }, item.status === 'completed' && styles.textCompleted]}>
                    {item.title}
                </Text>
                <Text style={[styles.subject, { color: theme.textMuted }]}>{item.subject}</Text>
            </View>

            <View style={styles.meta}>
                <Text style={[
                    styles.deadline,
                    item.status === 'completed' ? styles.badgeCompleted : styles.badgeActive
                ]}>
                    {item.deadline}
                </Text>
                <Pressable onPress={() => handleDelete(item.id)} style={styles.trashIcon}>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Daftar Tugas</Text>
                <Text style={styles.headerBadge}>{activeTasks.length} Aktif</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {tasks.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📚</Text>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>Belum ada tugas</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>Tap tombol + untuk menambah tugas kuliahmu</Text>
                    </View>
                )}

                {activeTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>TUGAS AKTIF</Text>
                        {activeTasks.map(item => <View key={item.id}>{renderTask({ item })}</View>)}
                    </>
                )}

                {completedTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>SELESAI</Text>
                        {completedTasks.map(item => <View key={item.id}>{renderTask({ item })}</View>)}
                    </>
                )}
            </ScrollView>

            <Pressable style={styles.fab} onPress={openModal}>
                <Text style={styles.fabIcon}>+</Text>
                <Text style={styles.fabText}>Tambah Tugas</Text>
            </Pressable>

            <Modal visible={showModal} transparent animationType="none" onRequestClose={closeModal}>
                <Pressable style={styles.overlay} onPress={closeModal}>
                    <Animated.View style={[styles.modal, { backgroundColor: theme.card, transform: [{ translateY: slideAnim }] }]}>
                        <Pressable>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Tambah Tugas Baru</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Judul Tugas</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                                    placeholder="Contoh: Laporan Akhir"
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                    value={form.title}
                                    onChangeText={v => setForm(f => ({ ...f, title: v }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Mata Kuliah</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                                    placeholder="Contoh: Jaringan Komputer"
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                    value={form.subject}
                                    onChangeText={v => setForm(f => ({ ...f, subject: v }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Deadline</Text>
                                <Pressable
                                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, justifyContent: 'center' }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: theme.text }}>
                                        {form.deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={form.deadline}
                                        mode="date"
                                        display="default"
                                        onChange={onDateChange}
                                        minimumDate={new Date()}
                                    />
                                )}
                            </View>

                            <View style={styles.modalActions}>
                                <Pressable style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={closeModal}>
                                    <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Batal</Text>
                                </Pressable>
                                <Pressable style={styles.saveBtn} onPress={handleAddTask}>
                                    <Text style={styles.saveBtnText}>Simpan</Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerBadge: {
        fontSize: 12, fontWeight: '700', color: '#3B82F6',
        backgroundColor: '#EFF6FF', paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 20,
    },
    scrollContent: { padding: 20, paddingBottom: 120 },
    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: '#9CA3AF',
        letterSpacing: 1.2, marginBottom: 12, marginTop: 8,
    },
    card: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderRadius: 16, marginBottom: 12,
        borderWidth: 1, elevation: 2,
    },
    cardCompleted: { opacity: 0.6 },
    checkButton: { marginRight: 16 },
    checkCircle: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    },
    checkMark: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    content: { flex: 1 },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    textCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
    subject: { fontSize: 13 },
    meta: { alignItems: 'flex-end', marginLeft: 10 },
    deadline: {
        fontSize: 11, fontWeight: '700', paddingHorizontal: 8,
        paddingVertical: 4, borderRadius: 8, marginBottom: 8,
    },
    badgeActive: { color: '#EF4444', backgroundColor: '#FEE2E2' },
    badgeCompleted: { color: '#10B981', backgroundColor: '#D1FAE5' },
    trashIcon: { padding: 4 },
    emptyContainer: { alignItems: 'center', paddingVertical: 100 },
    emptyIcon: { fontSize: 64, marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    fab: {
        position: 'absolute', bottom: 100, right: 24,
        backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 22, borderRadius: 30,
        elevation: 8, shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    fabIcon: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginRight: 8, lineHeight: 28 },
    fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 },
    modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 24 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    input: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
    cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    cancelBtnText: { fontSize: 16, fontWeight: '700' },
    saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
