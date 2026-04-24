import { useTheme } from '@/context/theme';
import { AttendanceService } from '@/services/attendance-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CREDENTIALS_KEY = '@account_credentials';

export default function SecuritySettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isDark, theme } = useTheme();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [credentials, setCredentials] = useState({
        username: 'admin',
        password: 'rahasia123',
    });
    const [tempCreds, setTempCreds] = useState({ ...credentials, confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [preAuthPass, setPreAuthPass] = useState('');
    const [isPreAuthed, setIsPreAuthed] = useState(false);
    const [showPreAuthModal, setShowPreAuthModal] = useState(false);

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        try {
            const data = await AsyncStorage.getItem(CREDENTIALS_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                setCredentials(parsed);
                setTempCreds(parsed);
            }
        } catch { } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!tempCreds.username.trim() || !tempCreds.password.trim()) {
            Alert.alert('Error', 'Username dan password tidak boleh kosong.');
            return;
        }
        if (tempCreds.password !== tempCreds.confirmPassword) {
            Alert.alert('Error', 'Konfirmasi password tidak cocok.');
            return;
        }

        setSaving(true);
        try {
            const saveObj = { username: tempCreds.username, password: tempCreds.password };
            await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(saveObj));
            setCredentials(saveObj);
            setIsEditing(false);
            setIsPreAuthed(false);
            Alert.alert('Berhasil', 'Kredensial akun berhasil diperbarui.');
        } catch {
            Alert.alert('Error', 'Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };

    const startEditing = async () => {
        // Try Biometric First
        const biometricResult = await AttendanceService.authenticateBiometrics();
        if (biometricResult) {
            setTempCreds({ ...credentials, confirmPassword: credentials.password });
            setIsEditing(true);
            setIsPreAuthed(true);
        } else {
            setShowPreAuthModal(true);
        }
    };

    const verifyPreAuthPass = () => {
        if (preAuthPass === credentials.password) {
            setTempCreds({ ...credentials, confirmPassword: credentials.password });
            setIsEditing(true);
            setIsPreAuthed(true);
            setShowPreAuthModal(false);
            setPreAuthPass('');
        } else {
            Alert.alert('Gagal', 'Password salah.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={{ fontSize: 20 }}>←</Text>
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Keamanan & Lokasi</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <Text style={styles.sectionLabel}>AKUN & AKSES</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textMuted }]}>Username</Text>
                        {!isEditing ? (
                            <Text style={[styles.value, { color: theme.text }]}>{credentials.username}</Text>
                        ) : (
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                                value={tempCreds.username}
                                onChangeText={v => setTempCreds({ ...tempCreds, username: v })}
                                autoCapitalize="none"
                            />
                        )}
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 12 }]} />

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textMuted }]}>Password</Text>
                        {!isEditing ? (
                            <Text style={[styles.value, { color: theme.text }]}>••••••••••••</Text>
                        ) : (
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                                    value={tempCreds.password}
                                    secureTextEntry={!showPassword}
                                    onChangeText={v => setTempCreds({ ...tempCreds, password: v })}
                                />
                                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                                    <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🙈'}</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {isEditing && (
                        <>
                            <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.textMuted }]}>Konfirmasi Password</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                                    value={tempCreds.confirmPassword}
                                    secureTextEntry={!showPassword}
                                    onChangeText={v => setTempCreds({ ...tempCreds, confirmPassword: v })}
                                />
                            </View>
                        </>
                    )}

                    <Pressable
                        style={[styles.editBtn, isEditing && { backgroundColor: theme.accent }]}
                        onPress={isEditing ? handleSave : startEditing}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={[styles.editBtnText, isEditing && { color: '#FFFFFF' }]}>
                                {isEditing ? 'Simpan Perubahan' : 'Ubah Username / Password'}
                            </Text>
                        )}
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>PENGATURAN AREA</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Link href="/gps-settings" asChild>
                        <Pressable style={styles.menuItem}>
                            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                                <Text style={styles.menuIcon}>📍</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuTitle, { color: theme.text }]}>Lokasi Absensi</Text>
                                <Text style={[styles.menuSub, { color: theme.textMuted }]}>Atur titik koordinat & radius absen</Text>
                            </View>
                            <Text style={[styles.arrow, { color: theme.textMuted }]}>›</Text>
                        </Pressable>
                    </Link>
                </View>

                <Text style={styles.sectionLabel}>PRIVASI</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.menuItem}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
                            <Text style={styles.menuIcon}>🔒</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuTitle, { color: theme.text }]}>Enkripsi Data</Text>
                            <Text style={[styles.menuSub, { color: theme.textMuted }]}>Data absensi disimpan dengan aman</Text>
                        </View>
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeText}>AKTIF</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.versionInfo}>
                    Terakhir diperbarui: 28 Feb 2026
                </Text>
            </ScrollView>

            {/* Pre-Auth Modal */}
            <Modal visible={showPreAuthModal} transparent animationType="fade" onRequestClose={() => setShowPreAuthModal(false)}>
                <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.preAuthModal, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Verifikasi Identitas</Text>
                        <Text style={[styles.modalSub, { color: theme.textMuted }]}>Masukkan password Anda saat ini untuk melanjutkan.</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text, marginTop: 15 }]}
                            placeholder="Password Sekarang"
                            placeholderTextColor={theme.textMuted}
                            secureTextEntry
                            value={preAuthPass}
                            onChangeText={setPreAuthPass}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => setShowPreAuthModal(false)}>
                                <Text style={{ color: theme.textMuted }}>Batal</Text>
                            </Pressable>
                            <Pressable style={[styles.modalConfirm, { backgroundColor: theme.accent }]} onPress={verifyPreAuthPass}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Verifikasi</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
    card: { borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, elevation: 2 },
    inputGroup: { width: '100%' },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    value: { fontSize: 17, fontWeight: '700' },
    input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 16 },
    editBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#3B82F6' },
    editBtnText: { color: '#3B82F6', fontWeight: '800', fontSize: 15 },
    divider: { height: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuIcon: { fontSize: 20 },
    menuTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    menuSub: { fontSize: 13 },
    arrow: { fontSize: 22, fontWeight: '300' },
    activeBadge: { backgroundColor: '#BBF7D0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    activeText: { fontSize: 10, fontWeight: '800', color: '#166534' },
    versionInfo: { textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 10 },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center' },
    eyeBtn: { position: 'absolute', right: 12, padding: 8 },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    preAuthModal: { width: '100%', borderRadius: 24, padding: 24, elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    modalSub: { fontSize: 14, lineHeight: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
    modalCancel: { paddingVertical: 12, paddingHorizontal: 20 },
    modalConfirm: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
});
