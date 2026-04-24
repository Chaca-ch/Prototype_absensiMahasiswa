import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ATTENDANCE_KEY, AttendanceService } from './attendance-service';

export interface ScheduleEntry {
    id: string;
    matkulNama: string;
    hari: string; // 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'
    jamMulai: string; // 'HH:mm'
    jamSelesai: string; // 'HH:mm'
    reminderEnabled: boolean;
}

const SCHEDULE_KEY = '@schedule_entries';

// Day name to JS weekday number (0=Sunday)
const HARI_TO_WEEKDAY: Record<string, number> = {
    Minggu: 0,
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
    Sabtu: 6,
};

export const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const ScheduleService = {
    async getSchedules(): Promise<ScheduleEntry[]> {
        try {
            const data = await AsyncStorage.getItem(SCHEDULE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    async saveSchedules(entries: ScheduleEntry[]): Promise<void> {
        await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(entries));
    },

    async addSchedule(entry: Omit<ScheduleEntry, 'id'>): Promise<ScheduleEntry> {
        const entries = await this.getSchedules();
        const newEntry: ScheduleEntry = {
            ...entry,
            id: `schedule_${Date.now()}`,
        };
        entries.push(newEntry);
        await this.saveSchedules(entries);
        return newEntry;
    },

    async deleteSchedule(id: string): Promise<void> {
        const entries = await this.getSchedules();
        const updated = entries.filter(e => e.id !== id);
        await this.saveSchedules(updated);
        // Cancel any pending notifications for this schedule
        await Notifications.cancelScheduledNotificationAsync(`checkin_${id}`).catch(() => { });
        await Notifications.cancelScheduledNotificationAsync(`checkout_${id}`).catch(() => { });
    },

    async toggleReminder(id: string): Promise<ScheduleEntry[]> {
        const entries = await this.getSchedules();
        const updated = entries.map(e =>
            e.id === id ? { ...e, reminderEnabled: !e.reminderEnabled } : e
        );
        await this.saveSchedules(updated);
        return updated;
    },

    // Schedule weekly repeating local notifications for all enabled entries
    async scheduleNotificationsForAll(entries: ScheduleEntry[]): Promise<void> {
        // Cancel all existing scheduled notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();

        for (const entry of entries) {
            if (!entry.reminderEnabled) continue;

            const weekday = HARI_TO_WEEKDAY[entry.hari];
            if (weekday === undefined) continue;

            const [startHour, startMin] = entry.jamMulai.split(':').map(Number);
            const [endHour, endMin] = entry.jamSelesai.split(':').map(Number);

            // Check-in reminder: 5 minutes before start
            let reminderMin = startMin - 5;
            let reminderHour = startHour;
            if (reminderMin < 0) {
                reminderMin += 60;
                reminderHour = Math.max(0, startHour - 1);
            }

            try {
                // Check-in reminder
                await Notifications.scheduleNotificationAsync({
                    identifier: `checkin_${entry.id}`,
                    content: {
                        title: '⏰ Waktunya Absen Masuk!',
                        body: `Jangan lupa check in untuk ${entry.matkulNama} yang mulai pukul ${entry.jamMulai}`,
                        sound: true,
                        data: { type: 'checkin', scheduleId: entry.id },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                        weekday: weekday === 0 ? 1 : weekday,
                        hour: reminderHour,
                        minute: reminderMin,
                    },
                });

                // Check-out reminder
                await Notifications.scheduleNotificationAsync({
                    identifier: `checkout_${entry.id}`,
                    content: {
                        title: '🚪 Waktunya Absen Keluar!',
                        body: `${entry.matkulNama} sudah selesai. Jangan lupa check out!`,
                        sound: true,
                        data: { type: 'checkout', scheduleId: entry.id },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                        weekday: weekday === 0 ? 1 : weekday,
                        hour: endHour,
                        minute: endMin,
                    },
                });
            } catch (err) {
                console.warn(`Failed to schedule notification for ${entry.matkulNama}:`, err);
            }
        }
    },

    // Called on app open: mark absent if schedule passed without check-in (scans last 7 days)
    async markAbsentIfMissed(userId: string): Promise<void> {
        try {
            const entries = await this.getSchedules();
            if (entries.length === 0) return;

            const allAttendance = await AttendanceService.getAttendanceHistory(userId);
            const now = new Date();

            // Scan last 7 days to fill any gaps (including today)
            for (let i = 0; i < 7; i++) {
                const scanDate = new Date();
                scanDate.setDate(now.getDate() - i);

                const dayName = Object.keys(HARI_TO_WEEKDAY).find(
                    k => HARI_TO_WEEKDAY[k] === scanDate.getDay()
                );

                if (!dayName) continue;
                const internalDate = AttendanceService.getInternalDate(scanDate);

                // Filter schedules for this specific day
                const daySchedules = entries.filter(s => s.hari === dayName);

                for (const entry of daySchedules) {
                    // check if any attendance record exists for this subject on THIS date
                    const hasRecord = allAttendance.find(
                        r => r.date === internalDate && r.subject === entry.matkulNama
                    );

                    if (!hasRecord) {
                        const [endHour, endMin] = entry.jamSelesai.split(':').map(Number);
                        const classEndTime = new Date(scanDate);
                        classEndTime.setHours(endHour, endMin, 0, 0);

                        // If class end time has passed (relative to NOW)
                        if (now > classEndTime) {
                            // Add alpha record for THAT specific date
                            // We need a version of addAbsentRecord that takes a date
                            await this.addAlphaForDate(userId, entry.matkulNama, internalDate);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('markAbsentIfMissed error:', err);
        }
    },

    // Helper to add alpha for a specific past date
    async addAlphaForDate(userId: string, subject: string, date: string): Promise<void> {
        try {
            const allRecords = await AttendanceService.getAllRecords();
            // Final check to prevent duplicates
            const exists = allRecords.find(r => r.userId === userId && r.date === date && r.subject === subject);
            if (exists) return;

            const record: any = {
                id: `${userId}_alpha_${date}_${Date.now()}`,
                userId,
                subject,
                checkInTime: '-',
                checkOutTime: '-',
                date: date,
                status: 'alpha',
                method: 'auto',
            };
            allRecords.push(record);
            await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(allRecords));
        } catch (error) {
            console.error('Error adding alpha for date:', error);
        }
    }
};
