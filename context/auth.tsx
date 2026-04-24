import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type User = {
    username: string;
    id: string;
    name: string;
    major: string;
};

type AuthContextType = {
    user: User | null;
    isReady: boolean;
    signIn: (username: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = '@auth_user';

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isReady, setIsReady] = useState(false);
    const segments = useSegments();
    const router = useRouter();

    // Load initial user state from storage
    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Failed to load user session", error);
            } finally {
                setIsReady(true);
            }
        };
        loadUser();
    }, []);

    // Handle routing logic safely once auth state resolves
    useEffect(() => {
        if (!isReady) return;

        const inAuthGroup = segments[0] === '(tabs)';

        if (!user && inAuthGroup) {
            // Redirect to login if user is not authenticated but trying to access protected routes
            router.replace('/login');
        } else if (user && segments[0] === 'login') {
            // Redirect to home if user is authenticated and trying to access login
            router.replace('/(tabs)');
        }
    }, [user, segments, isReady]);

    const signIn = async (username: string) => {
        // Mock login payload
        const userData = {
            username,
            id: '2105551234',
            name: 'Chamelia',
            major: 'Teknik Informatika',
        };
        try {
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
            setUser(userData);
            router.replace('/(tabs)');
        } catch (error) {
            console.error("Failed to save session", error);
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            setUser(null);
            router.replace('/login');
        } catch (error) {
            console.error("Failed to clear session", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isReady, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
