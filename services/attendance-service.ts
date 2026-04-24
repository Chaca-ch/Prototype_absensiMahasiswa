import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';

export interface AttendanceRecord {
    id: string;
    userId: string;
    subject: string;
    checkInTime: string;
    checkOutTime: string | null;
    date: string;
    status: 'checked-in' | 'checked-out' | 'incomplete' | 'alpha';
    location?: {
        latitude: number;
        longitude: number;
    };
    method: 'manual' | 'biometric' | 'auto';
}

export interface GpsConfig {
    latitude: number;
    longitude: number;
    radius: number; // meter
}

export const ATTENDANCE_KEY = '@attendance_records';
const GPS_CONFIG_KEY = '@gps_location_config';

// Default: Jimbaran, Bali
const DEFAULT_LOCATION: GpsConfig = {
    latitude: -8.7984,
    longitude: 115.1616,
    radius: 100,
};

export const AttendanceService = {
    // Get GPS config (from storage or default)
    async getLocationConfig(): Promise<GpsConfig> {
        try {
            const data = await AsyncStorage.getItem(GPS_CONFIG_KEY);
            if (data) return JSON.parse(data) as GpsConfig;
        } catch { }
        return DEFAULT_LOCATION;
    },

    async saveLocationConfig(config: GpsConfig): Promise<void> {
        await AsyncStorage.setItem(GPS_CONFIG_KEY, JSON.stringify(config));
    },

    // Internal helper for global storage
    async getAllRecords(): Promise<AttendanceRecord[]> {
        try {
            const data = await AsyncStorage.getItem(ATTENDANCE_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    // Internal date helper for consistency (YYYY-MM-DD)
    getInternalDate(date: Date = new Date()): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    // Get the currently active (checked-in) record for today
    async getActiveAttendance(userId: string): Promise<AttendanceRecord | null> {
        try {
            const today = this.getInternalDate();
            const records = await this.getAttendanceHistory(userId);
            // Look for any record from today that is still 'checked-in'
            return records.find(record => record.date === today && record.status === 'checked-in') || null;
        } catch (error) {
            console.error('Error getting active attendance:', error);
            return null;
        }
    },

    // Legacy support or specific today check
    async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
        const records = await this.getAttendanceHistory(userId);
        const today = this.getInternalDate();
        return records.find(r => r.date === today) || null;
    },

    async checkIn(
        userId: string,
        subject: string,
        method: 'manual' | 'biometric' = 'manual',
        location?: { latitude: number, longitude: number }
    ): Promise<AttendanceRecord> {
        try {
            const now = new Date();
            const record: AttendanceRecord = {
                id: `${userId}_${now.getTime()}`,
                userId,
                subject,
                checkInTime: now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }),
                checkOutTime: null,
                date: this.getInternalDate(now),
                status: 'checked-in',
                method,
                location,
            };

            const allRecords = await this.getAllRecords();
            allRecords.unshift(record); // Add to beginning (latest first)
            await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(allRecords));

            return record;
        } catch (error) {
            console.error('Error checking in:', error);
            throw error;
        }
    },

    async checkOut(userId: string): Promise<AttendanceRecord | null> {
        try {
            const now = new Date();
            const allRecords = await this.getAllRecords();
            const today = this.getInternalDate(now);

            const activeIndex = allRecords.findIndex(
                record => record.userId === userId && record.date === today && record.status === 'checked-in'
            );

            if (activeIndex !== -1) {
                const activeRecord = allRecords[activeIndex];
                activeRecord.checkOutTime = now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });
                activeRecord.status = 'checked-out';

                await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(allRecords));
                return activeRecord;
            }

            return null;
        } catch (error) {
            console.error('Error checking out:', error);
            throw error;
        }
    },

    async addAbsentRecord(userId: string, subject: string): Promise<void> {
        try {
            const now = new Date();
            const today = this.getInternalDate(now);

            // Check if an alpha ALREADY exists for this specific subject today
            const allRecords = await this.getAllRecords();
            const alreadyHasSubjectToday = allRecords.find(r => r.userId === userId && r.date === today && r.subject === subject);
            if (alreadyHasSubjectToday) return;

            const record: AttendanceRecord = {
                id: `${userId}_alpha_${now.getTime()}`,
                userId,
                subject,
                checkInTime: '-',
                checkOutTime: '-',
                date: today,
                status: 'alpha',
                method: 'auto',
            };
            allRecords.unshift(record);
            await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(allRecords));
        } catch (error) {
            console.error('Error adding absent record:', error);
        }
    },

    // Get attendance history
    async getAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
        try {
            const data = await AsyncStorage.getItem(ATTENDANCE_KEY);
            if (!data) return [];

            const allRecords: AttendanceRecord[] = JSON.parse(data);
            return allRecords.filter(record => record.userId === userId);
        } catch (error) {
            console.error('Error getting attendance history:', error);
            return [];
        }
    },

    // Geofencing verification (reads from storage)
    async isWithinRange(userLat: number, userLon: number): Promise<boolean> {
        const config = await this.getLocationConfig();
        const R = 6371e3;
        const φ1 = userLat * Math.PI / 180;
        const φ2 = config.latitude * Math.PI / 180;
        const Δφ = (config.latitude - userLat) * Math.PI / 180;
        const Δλ = (config.longitude - userLon) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= config.radius;
    },

    // Biometric authentication
    async authenticateBiometrics(): Promise<boolean> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                return false;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Verifikasi Absensi',
                fallbackLabel: 'Gunakan PIN',
            });

            return result.success;
        } catch (error) {
            console.error('Biometric auth error:', error);
            return false;
        }
    },

    // Clear all attendance records (for testing)
    async clearAllRecords(): Promise<void> {
        try {
            await AsyncStorage.removeItem(ATTENDANCE_KEY);
        } catch (error) {
            console.error('Error clearing records:', error);
        }
    },
    async checkInOrOut(userId: string, subject: string): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Quick permission check (avoids heavy UI bridge if already granted)
            const perm = await Location.getForegroundPermissionsAsync();
            if (!perm.granted) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    return { success: false, message: 'Izin lokasi diperlukan untuk absensi.' };
                }
            }

            // 2. ULTRA-PARALLEL: Fetch EVERYTHING at once
            // We start GPS and Biometrics immediately to maximize concurrency
            const [activeRecord, config, location, authenticated] = await Promise.all([
                this.getActiveAttendance(userId),
                this.getLocationConfig(),
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                this.authenticateBiometrics()
            ]);

            if (!authenticated) {
                return { success: false, message: 'Verifikasi biometrik gagal.' };
            }

            const { latitude, longitude } = location.coords;

            // 3. Geofencing check (now using pre-fetched config)
            const R = 6371e3;
            const φ1 = latitude * Math.PI / 180;
            const φ2 = config.latitude * Math.PI / 180;
            const Δφ = (config.latitude - latitude) * Math.PI / 180;
            const Δλ = (config.longitude - longitude) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > config.radius) {
                return { success: false, message: 'Anda berada di luar jangkauan lokasi absensi.' };
            }

            // 4. Perform check-in or check-out
            if (!activeRecord) {
                await this.checkIn(userId, subject, 'biometric', { latitude, longitude });
                return { success: true, message: `Check-in berhasil untuk ${subject}! Selamat belajar.` };
            } else {
                await this.checkOut(userId);
                return { success: true, message: `Check-out berhasil untuk ${activeRecord.subject}! Terima kasih.` };
            }
        } catch (error) {
            console.error('Attendance toggle error:', error);
            return { success: false, message: 'Terjadi kesalahan sistem.' };
        }
    },

    // Delete a specific record
    async deleteAttendanceRecord(recordId: string): Promise<boolean> {
        try {
            const data = await AsyncStorage.getItem(ATTENDANCE_KEY);
            if (!data) return false;

            let all = JSON.parse(data);
            const initialLength = all.length;
            all = all.filter((r: any) => r.id !== recordId);

            if (all.length !== initialLength) {
                await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(all));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete attendance error:', error);
            return false;
        }
    }
};
