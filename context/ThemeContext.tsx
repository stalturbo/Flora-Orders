import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

const lightColors = {
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  accent: '#F59E0B',
  accentLight: '#FCD34D',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textLight: '#334155',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  statusNew: '#8B5CF6',
  statusInWork: '#3B82F6',
  statusAssembled: '#10B981',
  statusOnDelivery: '#F97316',
  statusDelivered: '#06B6D4',
  statusCanceled: '#94A3B8',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  roleManager: '#3B82F6',
  roleFlorist: '#EC4899',
  roleCourier: '#F97316',
  roleOwner: '#8B5CF6',
  cardGradientStart: '#FFFFFF',
  cardGradientEnd: '#F8FAFC',
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
};

const darkColors = {
  primary: '#60A5FA',
  primaryLight: '#93C5FD',
  primaryDark: '#3B82F6',
  accent: '#FBBF24',
  accentLight: '#FDE68A',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  surfaceElevated: '#334155',
  text: '#F1F5F9',
  textLight: '#CBD5E1',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  error: '#F87171',
  errorLight: '#451A1A',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  statusNew: '#A78BFA',
  statusInWork: '#60A5FA',
  statusAssembled: '#34D399',
  statusOnDelivery: '#FB923C',
  statusDelivered: '#22D3EE',
  statusCanceled: '#64748B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  roleManager: '#60A5FA',
  roleFlorist: '#F472B6',
  roleCourier: '#FB923C',
  roleOwner: '#A78BFA',
  cardGradientStart: '#1E293B',
  cardGradientEnd: '#0F172A',
  inputBackground: '#1E293B',
  inputBorder: '#334155',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = '@flora_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(() => ({
    colors,
    isDark,
    themeMode,
    setThemeMode,
  }), [colors, isDark, themeMode, setThemeMode]);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
