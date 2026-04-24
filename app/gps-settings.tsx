import { useTheme } from '@/context/theme';
import { AttendanceService, GPSConfig } from '@/services/attendance-service';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function GPSSettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isDark, theme } = useTheme();
    const mapRef = useRef<MapView>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<GPSConfig>({
        latitude: -8.794,
        longitude: 115.162,
        radius: 100,
    });

    const currentTheme = {
        ...theme,
        mapStyle: isDark ? darkMapStyle : [],
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const saved = await AttendanceService.getLocationConfig();
        setConfig(saved);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await AttendanceService.saveLocationConfig(config);
            Alert.alert('Berhasil', 'Lokasi absensi telah diperbarui.');
            router.back();
        } catch {
            Alert.alert('Error', 'Gagal menyimpan konfigurasi.');
        } finally {
            setSaving(false);
        }
    };

    const useCurrentLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Aplikasi butuh izin lokasi.');
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            const newConfig = {
                ...config,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            setConfig(newConfig);
            mapRef.current?.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        } catch (e) {
            Alert.alert('Error', 'Gagal mengambil lokasi saat ini.');
        } finally {
            setLoading(false);
        }
    };

    const onMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setConfig({ ...config, latitude, longitude });
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
            <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={{ fontSize: 20 }}>←</Text>
                </Pressable>
                <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Lokasi Absensi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Pilih Lokasi di Peta</Text>
                    <Text style={[styles.sectionSubtitle, { color: currentTheme.textMuted }]}>
                        Tap pada peta untuk menentukan titik koordinat absen.
                    </Text>

                    <View style={[styles.mapContainer, { borderColor: currentTheme.border }]}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={{
                                latitude: config.latitude,
                                longitude: config.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            onPress={onMapPress}
                            customMapStyle={currentTheme.mapStyle}
                        >
                            <Marker coordinate={{ latitude: config.latitude, longitude: config.longitude }} />
                            <Circle
                                center={{ latitude: config.latitude, longitude: config.longitude }}
                                radius={config.radius}
                                strokeColor="rgba(59, 130, 246, 0.5)"
                                fillColor="rgba(59, 130, 246, 0.2)"
                            />
                        </MapView>
                    </View>

                    <Pressable style={styles.currentLocBtn} onPress={useCurrentLocation}>
                        <Text style={styles.currentLocText}>📍 Gunakan Lokasi Saya Sekarang</Text>
                    </Pressable>
                </View>

                <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Parameter Lokasi</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: currentTheme.textMuted }]}>Latitude</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, color: currentTheme.text }]}
                                value={config.latitude.toString()}
                                keyboardType="numeric"
                                onChangeText={v => setConfig({ ...config, latitude: parseFloat(v) || 0 })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: currentTheme.textMuted }]}>Longitude</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, color: currentTheme.text }]}
                                value={config.longitude.toString()}
                                keyboardType="numeric"
                                onChangeText={v => setConfig({ ...config, longitude: parseFloat(v) || 0 })}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: currentTheme.textMuted }]}>Radius Absensi (Meter)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border, color: currentTheme.text }]}
                            value={config.radius.toString()}
                            keyboardType="numeric"
                            placeholder="Contoh: 100"
                            onChangeText={v => setConfig({ ...config, radius: parseInt(v) || 0 })}
                        />
                        <Text style={[styles.hint, { color: currentTheme.textMuted }]}>
                            Jarak maksimal dari titik pusat agar bisa melakukan absensi.
                        </Text>
                    </View>
                </View>

                <Pressable
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
                    )}
                </Pressable>
            </ScrollView>
        </View>
    );
}

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
    { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
    { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 2,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    sectionSubtitle: { fontSize: 13, marginBottom: 20 },
    mapContainer: {
        height: 250,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 16,
    },
    map: { flex: 1 },
    currentLocBtn: {
        backgroundColor: '#EFF6FF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    currentLocText: { color: '#3B82F6', fontWeight: '700', fontSize: 14 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
    input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15 },
    hint: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
    saveBtn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        elevation: 4,
    },
    saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
