import { useColorScheme } from '@/hooks/use-color-scheme';
import { AttendanceRecord, AttendanceService } from '@/services/attendance-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DeletableTask {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  status: 'active' | 'completed';
  createdAt: string;
}

const TASKS_KEY = '@tasks_list';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'attendance' | 'tasks'>('attendance');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [taskHistory, setTaskHistory] = useState<DeletableTask[]>([]);
  const userId = 'user_001';

  const theme = {
    bg: isDark ? '#0F172A' : '#F9FAFB',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#111827',
    textMuted: isDark ? '#94A3B8' : '#6B7280',
    border: isDark ? '#334155' : '#F3F4F6',
    accent: '#3B82F6',
    cardBorder: isDark ? '#334155' : '#EEEEEE',
  };

  useFocusEffect(
    useCallback(() => {
      loadAllHistory();
    }, [userId])
  );

  const loadAllHistory = async () => {
    // Attendance
    const attData = await AttendanceService.getAttendanceHistory(userId);
    setAttendanceHistory(attData.sort((a, b) => b.id.localeCompare(a.id)));

    // Tasks
    const taskData = await AsyncStorage.getItem(TASKS_KEY);
    if (taskData) {
      const parsed: DeletableTask[] = JSON.parse(taskData);
      setTaskHistory(parsed.filter(t => t.status === 'completed').sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
  };

  const deleteAttendance = (id: string, status: string) => {
    if (status === 'checked-in') {
      Alert.alert('Tidak Bisa Menghapus', 'Absensi yang sedang berjalan tidak bisa dihapus. Silakan check-out terlebih dahulu.');
      return;
    }
    Alert.alert('Hapus Riwayat', 'Yakin ingin menghapus riwayat absen ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const success = await AttendanceService.deleteAttendanceRecord(id);
          if (success) {
            loadAllHistory();
          }
        }
      }
    ]);
  };

  const deleteCompletedTask = (id: string) => {
    Alert.alert('Hapus Tugas', 'Hapus tugas ini dari riwayat?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const fullData = await AsyncStorage.getItem(TASKS_KEY);
          if (fullData) {
            const parsed: DeletableTask[] = JSON.parse(fullData);
            const updated = parsed.filter(t => t.id !== id);
            await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
            setTaskHistory(taskHistory.filter(t => t.id !== id));
          }
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Riwayat Saya</Text>
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[styles.tabText, activeTab === 'attendance' ? styles.tabTextActive : { color: theme.textMuted }]}>Absensi</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Text style={[styles.tabText, activeTab === 'tasks' ? styles.tabTextActive : { color: theme.textMuted }]}>Tugas Selesai</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'attendance' ? (
          attendanceHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Belum ada riwayat absensi.</Text>
            </View>
          ) : (
            attendanceHistory.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.dateText, { color: theme.text }]}>{item.date}</Text>
                    <Text style={[styles.subjectText, { color: theme.text }]}>{item.subject}</Text>
                  </View>
                  <Pressable onPress={() => deleteAttendance(item.id, item.status)} style={styles.deleteBtn}>
                    <Text style={{ fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Masuk</Text>
                    <Text style={[styles.timeValue, { color: theme.text }]}>{item.checkInTime}</Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Pulang</Text>
                    <Text style={[styles.timeValue, { color: theme.text }]}>{item.checkOutTime || '--:--'}</Text>
                  </View>
                </View>
                <View style={[
                  styles.badge,
                  item.status === 'alpha' ? styles.badgeAlpha : (item.status === 'checked-out' ? styles.badgeDone : styles.badgeProgress)
                ]}>
                  <Text style={styles.badgeText}>
                    {item.status === 'alpha' ? 'Alpha' : (item.status === 'checked-out' ? 'Selesai' : 'Aktif')}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : (
          taskHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Belum ada tugas yang diselesaikan.</Text>
            </View>
          ) : (
            taskHistory.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subjectText, { color: theme.text, fontSize: 18 }]}>{item.title}</Text>
                    <Text style={[styles.dateText, { color: theme.textMuted }]}>{item.subject}</Text>
                  </View>
                  <Pressable onPress={() => deleteCompletedTask(item.id)} style={styles.deleteBtn}>
                    <Text style={{ fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
                <View style={styles.taskFooter}>
                  <Text style={[styles.deadlineText, { color: theme.textMuted }]}>Selesai: {item.deadline}</Text>
                  <View style={styles.badgeDone}>
                    <Text style={styles.badgeText}>Verified</Text>
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabText: { fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#3B82F6' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 56, marginBottom: 16, opacity: 0.5 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dateText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  subjectText: { fontSize: 15, fontWeight: '600' },
  deleteBtn: { padding: 8, marginRight: -8, marginTop: -8, opacity: 0.3 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  timeValue: { fontSize: 18, fontWeight: '800' },
  divider: { width: 1, height: 35, marginHorizontal: 20 },
  badge: { position: 'absolute', bottom: 20, right: 20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeDone: { backgroundColor: '#ECFDF5' },
  badgeAlpha: { backgroundColor: '#FEE2E2' },
  badgeProgress: { backgroundColor: '#FFFBEB' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  deadlineText: { fontSize: 12, fontWeight: '600' },
});
