import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
    theme: typeof colors.light;
    toggleTheme: () => void;
}

export const colors = {
    light: {
        bg: '#F9FAFB',
        card: '#FFFFFF',
        text: '#111827',
        textMuted: '#64748B',
        accent: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        border: '#E2E8F0',
        cardBorder: '#EEEEEE',
        inputBg: '#F9FAFB',
    },
    dark: {
        bg: '#0F172A',
        card: '#1E293B',
        text: '#F1F5F9',
        textMuted: '#94A3B8',
        accent: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        border: '#334155',
        cardBorder: '#334155',
        inputBg: '#0F172A',
    },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const deviceColorScheme = useDeviceColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedMode) {
                    setThemeModeState(savedMode as ThemeMode);
                }
            } catch (e) {
                console.error('Failed to load theme mode', e);
            }
        };
        loadTheme();
    }, []);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (e) {
            console.error('Failed to save theme mode', e);
        }
    };

    const isDark = themeMode === 'system'
        ? deviceColorScheme === 'dark'
        : themeMode === 'dark';

    const theme = isDark ? colors.dark : colors.light;

    const toggleTheme = () => {
        setThemeMode(isDark ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
