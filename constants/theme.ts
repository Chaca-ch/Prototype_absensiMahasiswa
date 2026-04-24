/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#047857';
const tintColorDark = '#10B981';

export const Colors = {
  light: {
    text: '#1F2937',
    background: '#F8FAFC',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#D1D5DB',
    tabIconSelected: tintColorLight,
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    primary: '#047857',
    secondary: '#059669',
  },
  dark: {
    text: '#F3F4F6',
    background: '#111827',
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#4B5563',
    tabIconSelected: tintColorDark,
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    primary: '#10B981',
    secondary: '#34D399',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
