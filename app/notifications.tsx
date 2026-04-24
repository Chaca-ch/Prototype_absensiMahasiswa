import { useTheme } from '@/context/theme';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    time: string;
    type: 'alert' | 'info' | 'success';
    isRead: boolean;
}

const DUMMY_NOTIFS: NotificationItem[] = [
    { id: '1', title: 'Jangan Lupa Check-in!', body: 'Matakuliah Pemrograman Mobile akan dimulai dalam 5 menit.', time: '10:55', type: 'alert', isRead: false },
    { id: '2', title: 'Absensi Berhasil', body: 'Kamu telah berhasil melakukan check-out Jaringan Komputer.', time: 'Kemarin', type: 'success', isRead: true },
    { id: '3', title: 'Tugas Baru', body: 'Dosen Matematika menambahkan tugas deadline minggu depan.', time: '2 hari lalu', type: 'info', isRead: true },
];

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isDark, theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={{ fontSize: 20 }}>←</Text>
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Notifikasi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {DUMMY_NOTIFS.map((notif) => (
                    <View key={notif.id} style={[styles.notifCard, { backgroundColor: theme.card, borderColor: theme.border }, !notif.isRead && { borderLeftColor: theme.accent, borderLeftWidth: 4 }]}>
                        <View style={styles.notifHeader}>
                            <Text style={[styles.notifTitle, { color: theme.text }]}>{notif.title}</Text>
                            <Text style={[styles.notifTime, { color: theme.textMuted }]}>{notif.time}</Text>
                        </View>
                        <Text style={[styles.notifBody, { color: theme.textMuted }]}>{notif.body}</Text>

                        <View style={styles.notifFooter}>
                            <View style={[
                                styles.typeBadge,
                                notif.type === 'alert' && { backgroundColor: '#FEE2E2' },
                                notif.type === 'success' && { backgroundColor: '#DCFCE7' },
                                notif.type === 'info' && { backgroundColor: '#DBEAFE' },
                            ]}>
                                <Text style={[
                                    styles.typeText,
                                    notif.type === 'alert' && { color: '#EF4444' },
                                    notif.type === 'success' && { color: '#10B981' },
                                    notif.type === 'info' && { color: '#3B82F6' },
                                ]}>
                                    {notif.type.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}

                {DUMMY_NOTIFS.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Belum ada notifikasi baru.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 16 },
    notifCard: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 1 },
    notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    notifTitle: { fontSize: 16, fontWeight: '700' },
    notifTime: { fontSize: 11, fontWeight: '600' },
    notifBody: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    notifFooter: { flexDirection: 'row', justifyContent: 'flex-start' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: '800' },
    emptyContainer: { padding: 100, alignItems: 'center' },
    emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.3 },
    emptyText: { fontSize: 16, fontWeight: '600' },
});
