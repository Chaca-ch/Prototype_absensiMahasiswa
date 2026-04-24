import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CloudAnimation from '@/components/cloud-animation';
import { useTheme } from '@/context/theme';
import { AttendanceService } from '@/services/attendance-service';
import { ScheduleService } from '@/services/schedule-service';
import { MaterialIcons } from '@expo/vector-icons';

const TASKS_KEY = '@tasks_list';
const USER_PROFILE_KEY = '@user_profile';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, theme, toggleTheme } = useTheme();

  const [status, setStatus] = useState<'checked-in' | 'checked-out' | 'none'>('none');
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({ name: 'Chamelia' });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSchedule, setActiveSchedule] = useState<ScheduleEntry | null>(null);
  const [nextSchedule, setNextSchedule] = useState<ScheduleEntry | null>(null);
  const [chartFilter, setChartFilter] = useState<'7days' | '1month' | '2years'>('7days');
  const userId = 'user_001';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const attHistory = await AttendanceService.getAttendanceHistory(userId);
      setHistory(attHistory);

      const schedules = await ScheduleService.getSchedules();
      const now = new Date();
      // Use Indonesian day names to match ScheduleService
      const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDay = daysIndo[now.getDay()];
      const currentHourMin = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      // Find current or upcoming class
      const todaySchedules = schedules
        .filter(s => s.hari === currentDay)
        .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));

      const active = todaySchedules.find(s => currentHourMin >= s.jamMulai && currentHourMin <= s.jamSelesai);
      setActiveSchedule(active || null);

      const next = todaySchedules.find(s => s.jamMulai > currentHourMin);
      setNextSchedule(next || null);

      const activeRec = await AttendanceService.getActiveAttendance(userId);
      if (activeRec) {
        setStatus('checked-in');
      } else {
        // If not checked-in, see if they already checked-out or are alpha for the LATEST session
        if (attHistory.length > 0) {
          const latest = attHistory[0];
          const today = AttendanceService.getInternalDate();
          if (latest.date === today) {
            setStatus(latest.status as any);
          } else {
            setStatus('none');
          }
        } else {
          setStatus('none');
        }
      }

      const taskData = await AsyncStorage.getItem(TASKS_KEY);
      const allTasks = taskData ? JSON.parse(taskData) : [];
      setTasks(allTasks.filter((t: any) => t.status === 'active'));

      const savedProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      }
    } catch { } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        await ScheduleService.markAbsentIfMissed(userId);
        await loadData();
      };
      init();
    }, [loadData, userId])
  );

  const isCheckInAvailable = () => {
    if (status !== 'none' || !nextSchedule) return false;

    // Allow check-in 5 minutes before start
    const [nowH, nowM] = currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).split(':').map(Number);
    const [startH, startM] = nextSchedule.jamMulai.split(':').map(Number);

    const nowInMinutes = nowH * 60 + nowM;
    const startInMinutes = startH * 60 + startM;

    return nowInMinutes >= startInMinutes - 5;
  };

  const handleAttendance = async (type: 'manual' | 'biometric') => {
    if (status === 'checked-out') return;

    const subject = activeSchedule?.matkulNama || nextSchedule?.matkulNama || "Mata Kuliah Umum";

    if (status === 'checked-in') {
      Alert.alert(
        'Check Out',
        `Apakah Anda yakin ingin menyelesaikan absensi untuk ${subject} sekarang?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Selesai', onPress: () => performAttendance(subject) }
        ]
      );
    } else {
      performAttendance(subject);
    }
  };

  const performAttendance = async (subject: string) => {
    setChecking(true);
    const result = await AttendanceService.checkInOrOut(userId, subject);

    if (result.success) {
      await loadData();
    } else {
      Alert.alert('Gagal', result.message);
    }
    setChecking(false);
  };

  const deleteRecord = async (id: string, recStatus: string) => {
    if (recStatus === 'checked-in') {
      Alert.alert('Gagal', 'Absensi yang sedang aktif tidak bisa dihapus. Silakan check-out terlebih dahulu.');
      return;
    }
    const success = await AttendanceService.deleteAttendanceRecord(id);
    if (success) {
      await loadData();
    }
  };


  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi,';
    if (hour < 15) return 'Selamat Siang,';
    if (hour < 18) return 'Selamat Sore,';
    return 'Selamat Malam,';
  };

  const formatDateHelper = (dateStr: string) => {
    try {
      if (!dateStr || dateStr === '-') return dateStr;
      if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // --- Statistics Logic (Memoized to prevent jumping on every clock tick) ---
  const chartInfo = useMemo(() => {
    const labels = [];
    const data = [];
    let count = chartFilter === '7days' ? 7 : (chartFilter === '1month' ? 4 : 12);

    for (let i = count - 1; i >= 0; i--) {
      if (chartFilter === '7days') {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('id-ID', { weekday: 'short' }).substring(0, 3));
        data.push(Math.floor(Math.random() * 80) + 20);
      } else if (chartFilter === '1month') {
        labels.push(`Mg ${count - i}`);
        data.push(Math.floor(Math.random() * 80) + 20);
      } else {
        const m = new Date(); m.setMonth(m.getMonth() - i);
        labels.push(m.toLocaleDateString('id-ID', { month: 'short' }).substring(0, 3));
        data.push(Math.floor(Math.random() * 80) + 20);
      }
    }
    return { labels, data };
  }, [chartFilter]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: '#6366F1' },
    { id: 'tugas', label: 'Tugas', icon: 'assignment', color: '#F59E0B' },
    { id: 'jadwal', label: 'Jadwal', icon: 'event', color: '#10B981' },
    { id: 'profile', label: 'Profile', icon: 'person', color: '#3B82F6' },
    { id: 'riwayat', label: 'Riwayat', icon: 'history', color: '#8B5CF6' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + (RNStatusBar.currentHeight || 20) + 10 }]}
      showsVerticalScrollIndicator={false}
    >
      <CloudAnimation />

      {/* 1. Welcome Greeting & Real-time Clock */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greetingText, { color: theme.textMuted }]}>{getGreeting()}</Text>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{profileData.name} 👋</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.themeToggle, { backgroundColor: isDark ? '#334155' : '#EEF2FF' }]}
            onPress={toggleTheme}
          >
            <MaterialIcons name={isDark ? "wb-sunny" : "nightlight-round"} size={22} color={isDark ? "#FBBF24" : "#6366F1"} />
          </Pressable>
          <View style={styles.clockContainer}>
            <Text style={[styles.liveTime, { color: theme.text }]}>
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
            <Text style={[styles.liveDate, { color: theme.textMuted }]}>
              {currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Attendance Linked with Schedule */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Absensi Perkuliahan</Text>
            <Text style={[styles.cardSubTitle, { color: theme.textMuted }]}>
              {activeSchedule ? 'Sedang Berlangsung' : (nextSchedule ? 'Jadwal Berikutnya' : 'Tidak Ada Jadwal')}
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: `${theme.accent}15` }]}>
            <Text style={[styles.statusTagText, { color: theme.accent }]}>
              {status === 'checked-in' ? 'AKTIF' : (status === 'checked-out' ? 'SELESAI' : 'MENUNGGU')}
            </Text>
          </View>
        </View>

        <View style={styles.scheduleDetailBox}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Mata Kuliah:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
              {activeSchedule?.matkulNama || nextSchedule?.matkulNama || '-'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Waktu:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {activeSchedule ? `${activeSchedule.jamMulai} - ${activeSchedule.jamSelesai}` : (nextSchedule ? `${nextSchedule.jamMulai} WIB` : '-')}
            </Text>
          </View>
        </View>

        <View style={styles.attendanceActions}>
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: status === 'checked-out' ? theme.bg : (status === 'checked-in' ? theme.danger : theme.accent) },
              (!activeSchedule && !isCheckInAvailable() && status === 'none') && { opacity: 0.5 }
            ]}
            onPress={() => handleAttendance('manual')}
            disabled={status === 'checked-out' || checking || (!activeSchedule && !isCheckInAvailable() && status === 'none')}
          >
            <Text style={styles.primaryBtnText}>
              {status === 'checked-in' ? 'CHECK OUT' : 'CHECK IN SEKARANG'}
            </Text>
          </Pressable>

          <View style={styles.biometricOptions}>
            <Pressable
              style={[styles.bioBtn, { borderColor: theme.border }]}
              onPress={() => handleAttendance('biometric')}
              disabled={status === 'checked-out' || checking || (!activeSchedule && !isCheckInAvailable() && status === 'none')}
            >
              <Text style={{ fontSize: 18 }}>👤</Text>
              <Text style={[styles.bioText, { color: theme.text }]}>Wajah</Text>
            </Pressable>
            <View style={{ width: 10 }} />
            <Pressable
              style={[styles.bioBtn, { borderColor: theme.border }]}
              onPress={() => handleAttendance('biometric')}
              disabled={status === 'checked-out' || checking || (!activeSchedule && !isCheckInAvailable() && status === 'none')}
            >
              <Text style={{ fontSize: 18 }}>☝️</Text>
              <Text style={[styles.bioText, { color: theme.text }]}>Sidik Jari</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 3. Attendance Statistics Chart */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistik Kehadiran</Text>
          <View style={[styles.filterRow, { backgroundColor: theme.bg }]}>
            {['7days', '1month', '2years'].map(f => (
              <Pressable
                key={f}
                onPress={() => setChartFilter(f as any)}
                style={[styles.filterBtn, chartFilter === f && { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.filterText, { color: chartFilter === f ? '#FFF' : theme.textMuted }]}>
                  {f === '7days' ? '7 Hr' : (f === '1month' ? '1 Bln' : '2 Thn')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.chartArea}>
          {chartInfo.labels.map((lbl, idx) => (
            <View key={idx} style={styles.chartCol}>
              <View style={[styles.chartBarBg, { backgroundColor: `${theme.accent}10` }]}>
                <View style={[styles.chartBar, { height: `${chartInfo.data[idx]}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.chartLabel, { color: theme.textMuted }]}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 4. Recent History (3 Days) */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Riwayat (3 Hari Terakhir)</Text>
        {history.slice(0, 3).map((h, i) => (
          <Pressable
            key={h.id}
            onLongPress={() => {
              Alert.alert('Hapus Riwayat', 'Hapus catatan absensi ini?', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: () => deleteRecord(h.id, h.status) }
              ]);
            }}
            style={[styles.historyRow, i !== 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
          >
            <View style={[styles.historyIcon, { backgroundColor: h.status === 'alpha' ? `${theme.danger}15` : `${theme.success}15` }]}>
              <Text style={{ fontSize: 16 }}>{h.status === 'alpha' ? '❌' : '✅'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyDate, { color: theme.text }]}>{formatDateHelper(h.date)}</Text>
              <Text style={[styles.historyDesc, { color: theme.textMuted }]}>
                {h.status === 'alpha' ? 'Alpha' : `Masuk: ${h.checkInTime} - Pulang: ${h.checkOutTime || '--:--'}`}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 5. Task Notifications */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginBottom: 100 }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Notifikasi Tugas</Text>
        {tasks.slice(0, 3).map((t, i) => (
          <View key={t.id} style={[styles.historyRow, i !== 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <View style={[styles.historyIcon, { backgroundColor: `${theme.warning}15` }]}>
              <Text style={{ fontSize: 16 }}>📝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyDate, { color: theme.text }]} numberOfLines={1}>{t.title}</Text>
              <Text style={[styles.historyDesc, { color: theme.danger, fontWeight: '700' }]}>Deadline: {t.deadline}</Text>
            </View>
          </View>
        ))}
        {tasks.length === 0 && <Text style={{ color: theme.textMuted, textAlign: 'center' }}>Tidak ada tugas aktif.</Text>}
      </View>

      {/* 6. Navigation Menu Grid (5 Items) */}
      <View style={[styles.menuGridContainer, { paddingBottom: 110 }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Menu Utama</Text>
        <View style={styles.gridContainer}>
          {menuItems.map(item => (
            <Pressable key={item.id} style={[styles.gridItem, { width: '31%' }]}>
              <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                <MaterialIcons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={[styles.gridLabel, { color: theme.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  greetingText: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  userName: { fontSize: 24, fontWeight: '800' },
  themeToggle: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  clockContainer: { alignItems: 'flex-end' },
  liveTime: { fontSize: 22, fontWeight: '900' },
  liveDate: { fontSize: 12, fontWeight: '600' },

  // Cards Base
  card: { borderRadius: 24, padding: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: 25, borderWidth: 1 },
  sectionCard: { borderRadius: 24, padding: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: 25, borderWidth: 1 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSubTitle: { fontSize: 12, fontWeight: '600' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusTagText: { fontSize: 10, fontWeight: '800' },

  scheduleDetailBox: { backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, borderRadius: 15, marginBottom: 20 },
  detailRow: { flexDirection: 'row', marginBottom: 8 },
  detailLabel: { width: 90, fontSize: 12, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 12, fontWeight: '800' },

  attendanceActions: { gap: 12 },
  primaryBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  biometricOptions: { flexDirection: 'row' },
  bioBtn: { flex: 1, height: 50, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  bioText: { fontSize: 12, fontWeight: '700' },

  // Stats Chart
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  filterRow: { flexDirection: 'row', padding: 3, borderRadius: 12 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  filterText: { fontSize: 10, fontWeight: '700' },
  chartArea: { flexDirection: 'row', justifyContent: 'space-between', height: 100, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarBg: { width: 12, height: 70, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBar: { width: '100%', borderRadius: 6 },
  chartLabel: { fontSize: 9, fontWeight: '700', marginTop: 8 },

  // List Items
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  historyIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyDate: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  historyDesc: { fontSize: 12, fontWeight: '600' },

  // Menu Grid
  menuGridContainer: { marginTop: 10 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  gridItem: { alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridLabel: { fontSize: 11, fontWeight: '700' },
});
