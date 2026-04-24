import { useColorScheme } from '@/hooks/use-color-scheme';
import { HARI_LIST, ScheduleEntry, ScheduleService } from '@/services/schedule-service';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JadwalScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        matkulNama: '',
        hari: 'Senin',
        jamMulai: new Date(),
        jamSelesai: new Date(),
        reminderEnabled: true,
    });
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
    const slideAnim = useRef(new Animated.Value(500)).current;

    const theme = {
        bg: isDark ? '#0F172A' : '#F9FAFB',
        card: isDark ? '#1E293B' : '#FFFFFF',
        text: isDark ? '#F1F5F9' : '#111827',
        textMuted: isDark ? '#94A3B8' : '#6B7280',
        border: isDark ? '#334155' : '#E5E7EB',
        accent: '#8B5CF6',
    };

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        const data = await ScheduleService.getSchedules();
        setSchedules(data);
    };

    const openModal = () => {
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        const end = new Date(now);
        end.setHours(now.getHours() + 2);

        setForm({ matkulNama: '', hari: 'Senin', jamMulai: now, jamSelesai: end, reminderEnabled: true });
        setShowModal(true);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
            setShowModal(false);
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleAdd = async () => {
        if (!form.matkulNama.trim()) {
            Alert.alert('Peringatan', 'Nama mata kuliah wajib diisi.');
            return;
        }

        const newEntry = await ScheduleService.addSchedule({
            matkulNama: form.matkulNama.trim(),
            hari: form.hari,
            jamMulai: formatTime(form.jamMulai),
            jamSelesai: formatTime(form.jamSelesai),
            reminderEnabled: form.reminderEnabled,
        });
        const updated = [...schedules, newEntry];
        setSchedules(updated);
        await ScheduleService.scheduleNotificationsForAll(updated);
        closeModal();
        Alert.alert('✅ Jadwal Ditambah', `${form.matkulNama} berhasil dijadwalkan.`);
    };

    const handleDelete = (id: string, nama: string) => {
        Alert.alert('Hapus Jadwal', `Hapus jadwal "${nama}"?`, [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive',
                onPress: async () => {
                    await ScheduleService.deleteSchedule(id);
                    const updated = schedules.filter(s => s.id !== id);
                    setSchedules(updated);
                    await ScheduleService.scheduleNotificationsForAll(updated);
                }
            }
        ]);
    };

    const handleToggleReminder = async (id: string) => {
        const updated = await ScheduleService.toggleReminder(id);
        setSchedules(updated);
        await ScheduleService.scheduleNotificationsForAll(updated);
    };

    const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowPicker(null);
        if (selectedDate) {
            if (showPicker === 'start') {
                setForm({ ...form, jamMulai: selectedDate });
            } else {
                setForm({ ...form, jamSelesai: selectedDate });
            }
        }
    };

    const grouped = HARI_LIST.reduce<Record<string, ScheduleEntry[]>>((acc, hari) => {
        const entries = schedules.filter(s => s.hari === hari);
        if (entries.length) acc[hari] = entries;
        return acc;
    }, {});

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Jadwal Kuliah</Text>
                <Text style={styles.headerBadge}>{schedules.length} SKS</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {schedules.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📅</Text>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>Belum ada jadwal</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                            Susun jadwal kuliahmu untuk pengingat absensi otomatis
                        </Text>
                    </View>
                ) : (
                    Object.entries(grouped).map(([hari, entries]) => (
                        <View key={hari} style={styles.dayGroup}>
                            <Text style={[styles.dayLabel, { color: theme.accent }]}>{hari.toUpperCase()}</Text>
                            {entries.map(entry => (
                                <View key={entry.id} style={[styles.scheduleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <View style={styles.timeBlock}>
                                        <Text style={[styles.timeText, { color: theme.accent }]}>{entry.jamMulai}</Text>
                                        <View style={[styles.timeLine, { backgroundColor: isDark ? '#4C1D95' : '#DDD6FE' }]} />
                                        <Text style={[styles.timeText, { color: theme.accent }]}>{entry.jamSelesai}</Text>
                                    </View>
                                    <View style={styles.scheduleInfo}>
                                        <Text style={[styles.scheduleName, { color: theme.text }]}>{entry.matkulNama}</Text>
                                        <View style={styles.scheduleFooter}>
                                            <Text style={[styles.scheduleTime, { color: theme.textMuted }]}>
                                                {entry.jamMulai} – {entry.jamSelesai}
                                            </Text>
                                            <Switch
                                                value={entry.reminderEnabled}
                                                onValueChange={() => handleToggleReminder(entry.id)}
                                                trackColor={{ false: theme.border, true: isDark ? '#4C1D95' : '#BFDBFE' }}
                                                thumbColor={entry.reminderEnabled ? theme.accent : theme.textMuted}
                                                style={{ transform: [{ scale: 0.8 }] }}
                                            />
                                        </View>
                                    </View>
                                    <Pressable style={styles.deleteBtn} onPress={() => handleDelete(entry.id, entry.matkulNama)}>
                                        <Text style={{ fontSize: 18 }}>🗑️</Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    ))
                )}
            </ScrollView>

            <Pressable style={[styles.fab, { backgroundColor: theme.accent }]} onPress={openModal}>
                <Text style={styles.fabIcon}>+</Text>
                <Text style={styles.fabText}>Tambah Jadwal</Text>
            </Pressable>

            <Modal visible={showModal} transparent animationType="none" onRequestClose={closeModal}>
                <Pressable style={styles.overlay} onPress={closeModal}>
                    <Animated.View style={[styles.modal, { backgroundColor: theme.card, transform: [{ translateY: slideAnim }] }]}>
                        <Pressable>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Tambah Jadwal</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Nama Mata Kuliah</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                                    placeholder="Contoh: Pemrograman Mobile"
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                    value={form.matkulNama}
                                    onChangeText={v => setForm(f => ({ ...f, matkulNama: v }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Hari</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                    {HARI_LIST.map(hari => (
                                        <Pressable
                                            key={hari}
                                            style={[styles.hariChip, { borderColor: theme.border }, form.hari === hari && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                                            onPress={() => setForm(f => ({ ...f, hari }))}>
                                            <Text style={[styles.hariChipText, { color: theme.textMuted }, form.hari === hari && { color: '#FFFFFF' }]}>
                                                {hari}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                                    <Text style={styles.formLabel}>Jam Mulai</Text>
                                    <Pressable
                                        style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, justifyContent: 'center' }]}
                                        onPress={() => setShowPicker('start')}
                                    >
                                        <Text style={{ color: theme.text }}>{formatTime(form.jamMulai)}</Text>
                                    </Pressable>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Jam Selesai</Text>
                                    <Pressable
                                        style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, justifyContent: 'center' }]}
                                        onPress={() => setShowPicker('end')}
                                    >
                                        <Text style={{ color: theme.text }}>{formatTime(form.jamSelesai)}</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {showPicker && (
                                <DateTimePicker
                                    value={showPicker === 'start' ? form.jamMulai : form.jamSelesai}
                                    mode="time"
                                    is24Hour={true}
                                    display="spinner"
                                    onChange={onTimeChange}
                                />
                            )}

                            <View style={[styles.reminderRow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                                <View>
                                    <Text style={styles.formLabel}>Aktifkan Pengingat</Text>
                                    <Text style={[styles.reminderHint, { color: theme.textMuted }]}>Notif check-in 5 menit sebelum kelas</Text>
                                </View>
                                <Switch
                                    value={form.reminderEnabled}
                                    onValueChange={v => setForm(f => ({ ...f, reminderEnabled: v }))}
                                    trackColor={{ false: theme.border, true: isDark ? '#4C1D95' : '#BFDBFE' }}
                                    thumbColor={form.reminderEnabled ? theme.accent : theme.textMuted}
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <Pressable style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={closeModal}>
                                    <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Batal</Text>
                                </Pressable>
                                <Pressable style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleAdd}>
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
    header: { paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerBadge: { fontSize: 13, fontWeight: '700', color: '#8B5CF6', backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    scrollContent: { padding: 20, paddingBottom: 120 },
    dayGroup: { marginBottom: 24 },
    dayLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
    scheduleCard: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, elevation: 2 },
    timeBlock: { alignItems: 'center', marginRight: 16, paddingTop: 4, width: 45 },
    timeText: { fontSize: 12, fontWeight: '800' },
    timeLine: { width: 3, height: 24, marginVertical: 4, borderRadius: 2 },
    scheduleInfo: { flex: 1 },
    scheduleName: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
    scheduleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scheduleTime: { fontSize: 13 },
    deleteBtn: { padding: 4, marginLeft: 12 },
    emptyContainer: { alignItems: 'center', paddingVertical: 100 },
    emptyIcon: { fontSize: 64, marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 30 },
    fab: { position: 'absolute', bottom: 100, right: 24, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 30, elevation: 8, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
    fabIcon: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginRight: 8, lineHeight: 28 },
    fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 },
    modalHandle: { width: 40, height: 5, backgroundColor: '#CBD5E1', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 24 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    input: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 16, minHeight: 54 },
    row: { flexDirection: 'row' },
    hariChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1, marginRight: 8, backgroundColor: 'transparent' },
    hariChipText: { fontSize: 13, fontWeight: '700' },
    reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
    reminderHint: { fontSize: 12, marginTop: 4 },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    cancelBtnText: { fontSize: 16, fontWeight: '700' },
    saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
