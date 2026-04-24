import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
    const { isDark, theme } = useTheme();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Error', 'Username dan Password tidak boleh kosong');
            return;
        }

        setIsLoading(true);
        try {
            const data = await AsyncStorage.getItem('@account_credentials');
            let validUser = 'admin';
            let validPass = 'rahasia123';

            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.username) validUser = parsed.username;
                if (parsed.password) validPass = parsed.password;
            }

            // Small delay for UX
            await new Promise(resolve => setTimeout(resolve, 800));

            if (username.toLowerCase() === validUser.toLowerCase() && password === validPass) {
                signIn(username);
            } else {
                Alert.alert('Login Gagal', 'Username atau password salah.');
            }
        } catch {
            Alert.alert('Error', 'Terjadi kesalahan sistem.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.accent }]}>Reactica</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>Sistem Absensi Mahasiswa</Text>
                </View>

                <View style={[styles.form, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Username</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                            placeholder="Masukkan Username"
                            placeholderTextColor={theme.textMuted}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                        <View style={[styles.passwordContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.passwordInput, { color: theme.text }]}
                                placeholder="Masukkan Password"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <Pressable
                                style={styles.eyeIconContainer}
                                onPress={() => setShowPassword(!showPassword)}>
                                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                            </Pressable>
                        </View>
                    </View>

                    <Pressable
                        style={[styles.loginButton, { backgroundColor: theme.accent }, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Masuk</Text>
                        )}
                    </Pressable>
                </View>

                <Text style={[styles.footerText, { color: theme.textMuted }]}>
                    Gunakan username: <Text style={[styles.bold, { color: theme.text }]}>admin</Text>{'\n'}
                    Password: <Text style={[styles.bold, { color: theme.text }]}>rahasia123</Text>
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 44, fontWeight: '900', letterSpacing: -1.5, marginBottom: 8 },
    subtitle: { fontSize: 16, fontWeight: '600' },
    form: { padding: 24, borderRadius: 24, borderWidth: 1, elevation: 4, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
    input: { borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 16, fontWeight: '600' },
    passwordContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, alignItems: 'center' },
    passwordInput: { flex: 1, padding: 16, fontSize: 16, fontWeight: '600' },
    eyeIconContainer: { padding: 16 },
    eyeIcon: { fontSize: 20 },
    loginButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    footerText: { marginTop: 30, textAlign: 'center', fontSize: 13, lineHeight: 22, fontWeight: '600' },
    bold: { fontWeight: '800' },
});
