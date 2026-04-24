import { useTheme } from '@/context/theme';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
    const { isDark, theme } = useTheme();
    const [filterType, setFilterType] = useState('Semua');

    const historyData = [
        { id: '1', date: '25 Agustus 2026', time: '08:00', subject: 'Pemrograman Web', status: 'Hadir' },
        { id: '2', date: '26 Agustus 2026', time: '10:15', subject: 'Jaringan Komputer', status: 'Terlambat' },
        { id: '3', date: '27 Agustus 2026', time: '13:00', subject: 'Sistem Operasi', status: 'Hadir' },
        { id: '4', date: '5 September 2026', time: '08:05', subject: 'Basis Data', status: 'Hadir' },
        { id: '5', date: '12 Oktober 2026', time: '09:00', subject: 'Kecerdasan Buatan', status: 'Izin' },
    ];

    const getFilteredData = () => {
        if (filterType === 'Semua') return historyData;
        if (filterType === 'Bulan Ini') return historyData.filter(d => d.date.includes('Agustus'));
        if (filterType === 'Bulan Lalu') return [];
        return historyData;
    };

    const filterOptions = ['Semua', 'Bulan Ini', 'Bulan Lalu', 'Tahun Ini'];

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.filterWrapper, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {filterOptions.map((opt) => (
                        <Pressable
                            key={opt}
                            style={[
                                styles.filterChip,
                                { backgroundColor: isDark ? theme.border : '#F3F4F6' },
                                filterType === opt && { backgroundColor: theme.accent }
                            ]}
                            onPress={() => setFilterType(opt)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: theme.textMuted },
                                filterType === opt && { color: '#FFFFFF' }
                            ]}>{opt}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={getFilteredData()}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>Tidak ada riwayat untuk filter ini.</Text>
                }
                renderItem={({ item }) => (
                    <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.historyInfo}>
                            <Text style={[styles.historySubject, { color: theme.text }]}>{item.subject}</Text>
                            <Text style={[styles.historyDate, { color: theme.textMuted }]}>{item.date}</Text>
                        </View>
                        <View style={styles.historyStatus}>
                            <Text style={[styles.historyTime, { color: theme.text }]}>{item.time}</Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: item.status === 'Hadir' ? `${theme.success}15` : (item.status === 'Terlambat' ? `${theme.danger}15` : `${theme.warning}15`) }
                            ]}>
                                <Text style={[
                                    styles.historyBadgeText,
                                    { color: item.status === 'Hadir' ? theme.success : (item.status === 'Terlambat' ? theme.danger : theme.warning) }
                                ]}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterWrapper: { paddingVertical: 12, borderBottomWidth: 1 },
    filterScroll: { paddingHorizontal: 16, gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    filterChipActive: { backgroundColor: '#3B82F6' },
    filterText: { fontSize: 13, fontWeight: '700' },
    filterTextActive: { color: '#FFFFFF' },
    listContainer: { padding: 16 },
    emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, fontWeight: '600' },
    historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 2, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    historyInfo: { flex: 1 },
    historySubject: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    historyDate: { fontSize: 13, fontWeight: '600' },
    historyStatus: { alignItems: 'flex-end' },
    historyTime: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    historyBadgeText: { fontSize: 11, fontWeight: '800' },
});
