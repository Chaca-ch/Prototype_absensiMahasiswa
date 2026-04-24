import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { AttendanceService } from '@/services/attendance-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const USER_PROFILE_KEY = '@user_profile';
const PROFILE_IMAGE_KEY = '@profile_image';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { isDark, theme } = useTheme();

  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Chamelia',
    id: '2105551234',
    major: 'Teknik Informatika',
    faculty: 'Fakultas Teknik',
    campus: 'Kampus Jimbaran',
    address: 'Jl. Raya Kampus Unud, Jimbaran, Badung, Bali',
  });
  const [tempProfile, setTempProfile] = useState({ ...profile });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const userId = 'user_001';

  useEffect(() => {
    const loadData = async () => {
      // Load Stats
      const history = await AttendanceService.getAttendanceHistory(userId);
      const present = history.filter(r => r.status === 'checked-out' || r.status === 'checked-in').length;
      const absent = history.filter(r => r.status === 'alpha').length;
      setStats({ present, late: 0, absent });

      // Load Profile
      const savedProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setTempProfile(parsed);
      }

      // Load Image
      const savedImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
      if (savedImage) setProfileImage(savedImage);
    };
    loadData();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Maaf, kami butuh izin galeri untuk mengganti foto.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
    }
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSave = async () => {
    if (!tempProfile.name.trim() || !tempProfile.id.trim()) {
      Alert.alert('Error', 'Nama dan NIM tidak boleh kosong.');
      return;
    }
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(tempProfile));
      setProfile(tempProfile);
      setIsEditing(false);
      Alert.alert('Berhasil', 'Profil Anda telah diperbarui.');
    } catch {
      Alert.alert('Error', 'Gagal menyimpan profil.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profil Saya</Text>
          {isEditing && (
            <Pressable onPress={() => setIsEditing(false)}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Batal</Text>
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Section */}
          <View style={[styles.profileSection, { backgroundColor: theme.card }]}>
            <Pressable onPress={pickImage} style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#334155' : '#F3F4F6' }]}>
                  <Text style={[styles.avatarText, { color: theme.accent }]}>
                    {profile.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Text style={{ fontSize: 12 }}>📷</Text>
              </View>
            </Pressable>

            {!isEditing ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
                <Text style={[styles.profileId, { color: theme.textMuted }]}>{profile.id}</Text>
                <Text style={[styles.profileMajor, { color: theme.textMuted }]}>{profile.major}</Text>
                <Text style={[styles.profileSub, { color: theme.textMuted, marginTop: 4 }]}>{profile.faculty}</Text>
                <Text style={[styles.profileSub, { color: theme.textMuted }]}>{profile.campus}</Text>
                <Text style={[styles.profileAddress, { color: theme.accent, marginTop: 8 }]}>📍 {profile.address}</Text>
              </View>
            ) : (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Lengkap</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    value={tempProfile.name}
                    onChangeText={(val) => setTempProfile({ ...tempProfile, name: val })}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NIM / ID Mahasiswa</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    value={tempProfile.id}
                    onChangeText={(val) => setTempProfile({ ...tempProfile, id: val })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Program Studi</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    value={tempProfile.major}
                    onChangeText={(val) => setTempProfile({ ...tempProfile, major: val })}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Fakultas</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    value={tempProfile.faculty}
                    onChangeText={(val) => setTempProfile({ ...tempProfile, faculty: val })}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Kampus</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    value={tempProfile.campus}
                    onChangeText={(val) => setTempProfile({ ...tempProfile, campus: val })}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Alamat</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    value={tempProfile.address}
                    onChangeText={(val) => setTempProfile({ ...tempProfile, address: val })}
                    multiline
                  />
                </View>
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
                </Pressable>
              </View>
            )}
          </View>

          {!isEditing && (
            <>
              {/* Stats */}
              <View style={[styles.statsContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.present}</Text>
                  <Text style={styles.statLabel}>Hadir</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.late}</Text>
                  <Text style={styles.statLabel}>Telat</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.absent}</Text>
                  <Text style={styles.statLabel}>Alpha</Text>
                </View>
              </View>

              {/* Menu */}
              <View style={[styles.menuContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Pressable style={styles.menuItem} onPress={() => setIsEditing(true)}>
                  <Text style={styles.menuIcon}>👤</Text>
                  <Text style={[styles.menuText, { color: theme.text }]}>Edit Profil</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </Pressable>
                <View style={[styles.menuSep, { backgroundColor: theme.border }]} />
                <Link href="/notifications" asChild>
                  <Pressable style={styles.menuItem}>
                    <Text style={styles.menuIcon}>🔔</Text>
                    <Text style={[styles.menuText, { color: theme.text }]}>Notifikasi</Text>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>
                </Link>
                <View style={[styles.menuSep, { backgroundColor: theme.border }]} />
                <Link href="/security" asChild>
                  <Pressable style={styles.menuItem}>
                    <Text style={styles.menuIcon}>🛡️</Text>
                    <Text style={[styles.menuText, { color: theme.text }]}>Keamanan & Lokasi</Text>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>
                </Link>
                <View style={[styles.menuSep, { backgroundColor: theme.border }]} />
                <Pressable style={styles.menuItem} onPress={handleLogout}>
                  <Text style={styles.menuIcon}>🚪</Text>
                  <Text style={[styles.menuText, { color: '#EF4444' }]}>Keluar Akun</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </Pressable>
              </View>

              <Text style={styles.versionText}>Aplikasi Reactica v1.2.0 • {isDark ? 'Mode Gelap' : 'Mode Terang'}</Text>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  profileSection: { alignItems: 'center', paddingVertical: 35, marginBottom: 16 },
  avatarContainer: { width: 110, height: 110, position: 'relative', marginBottom: 20 },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#3B82F6' },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  avatarText: { fontSize: 36, fontWeight: '800' },
  editIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFFFFF', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  profileName: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  profileId: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  profileMajor: { fontSize: 15, marginBottom: 4 },
  profileSub: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  profileAddress: { fontSize: 12, fontWeight: '700', paddingHorizontal: 40, textAlign: 'center' },
  editForm: { width: '100%', paddingHorizontal: 24 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16 },
  saveButton: { backgroundColor: '#3B82F6', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  statsContainer: { flexDirection: 'row', paddingVertical: 24, marginHorizontal: 20, borderRadius: 20, marginBottom: 24, borderWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  divider: { width: 1, height: 35 },
  menuContainer: { marginHorizontal: 20, borderRadius: 20, paddingVertical: 6, borderWidth: 1 },
  menuSep: { height: 1, marginLeft: 60 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  menuIcon: { fontSize: 22, marginRight: 18 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '700' },
  menuArrow: { fontSize: 20, color: '#CBD5E1' },
  versionText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 30, fontWeight: '600' },
});
