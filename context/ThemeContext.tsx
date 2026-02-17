import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

// ===== Brand =====
const BRAND = {
  primary: "#7b87c7",
  primaryDark: "#6673b9",
  primaryLight: "#9aa3de",
  accent: "#f4b6c2", // нежный розовый акцент (можно потом поменять)
};

// ===== Design Tokens =====
const TOKENS = {
  radius: {
    xs: 10,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
};

const lightColors = {
  // brand
  primary: BRAND.primary,
  primaryLight: BRAND.primaryLight,
  primaryDark: BRAND.primaryDark,
  accent: BRAND.accent,
  accentLight: "#fde2e8",

  // surfaces
  background: "#F6F7FB",           // чуть сиреневый подтон
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F2FA",     // мягкая подложка
  surfaceElevated: "#FFFFFF",

  // text
  text: "#0F172A",
  textLight: "#1F2937",
  textSecondary: "#5B647A",
  textMuted: "#8791A7",

  // borders & shadows
  border: "rgba(123,135,199,0.18)",
  borderLight: "rgba(123,135,199,0.10)",
  shadow: "rgba(15, 23, 42, 0.10)",

  // feedback
  error: "#EF4444",
  errorLight: "#FEF2F2",
  success: "#10B981",
  successLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",

  // statuses
  statusNew: "#7b87c7",
  statusInWork: "#5aa6e6",
  statusAssembled: "#18b99a",
  statusOnDelivery: "#f59e0b",
  statusDelivered: "#22c3ee",
  statusCanceled: "#9aa3b2",

  // overlay
  overlay: "rgba(0,0,0,0.40)",

  // roles (можно потом привязать к бренду сильнее)
  roleManager: "#7b87c7",
  roleFlorist: "#ec6aa5",
  roleCourier: "#f59e0b",
  roleOwner: "#8b5cf6",

  // gradients
  cardGradientStart: "#FFFFFF",
  cardGradientEnd: "#F6F7FB",

  // inputs
  inputBackground: "#FFFFFF",
  inputBorder: "rgba(123,135,199,0.20)",

  // tokens passthrough
  tokens: TOKENS,
};

const darkColors = {
  // brand
  primary: "#9aa3de",
  primaryLight: "#b6bdf0",
  primaryDark: "#7b87c7",
  accent: "#f4b6c2",
  accentLight: "#6b3a44",

  // surfaces
  background: "#0B1020",
  surface: "#141B2F",
  surfaceSecondary: "#1B2440",
  surfaceElevated: "#1B2440",

  // text
  text: "#EEF2FF",
  textLight: "#D8DDF0",
  textSecondary: "#AAB2D6",
  textMuted: "#7A86AE",

  // borders & shadows
  border: "rgba(154,163,222,0.22)",
  borderLight: "rgba(154,163,222,0.12)",
  shadow: "rgba(0,0,0,0.45)",

  // feedback
  error: "#F87171",
  errorLight: "#3A1515",
  success: "#34D399",
  successLight: "#063B2E",
  warning: "#FBBF24",
  warningLight: "#3B2A07",

  // statuses
  statusNew: "#9aa3de",
  statusInWork: "#60a5fa",
  statusAssembled: "#34d399",
  statusOnDelivery: "#fbbf24",
  statusDelivered: "#22d3ee",
  statusCanceled: "#7A86AE",

  // overlay
  overlay: "rgba(0,0,0,0.65)",

  // roles
  roleManager: "#9aa3de",
  roleFlorist: "#f472b6",
  roleCourier: "#fbbf24",
  roleOwner: "#a78bfa",

  // gradients
  cardGradientStart: "#1B2440",
  cardGradientEnd: "#0B1020",

  // inputs
  inputBackground: "#141B2F",
  inputBorder: "rgba(154,163,222,0.25)",

  // tokens passthrough
  tokens: TOKENS,
};

export type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "@flora_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
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
    if (themeMode === "system") return systemColorScheme === "dark";
    return themeMode === "dark";
  }, [themeMode, systemColorScheme]);

  const colors = (isDark ? darkColors : lightColors) as ThemeColors;

  const value = useMemo(
    () => ({
      colors,
      isDark,
      themeMode,
      setThemeMode,
    }),
    [colors, isDark, themeMode, setThemeMode]
  );

  if (!isLoaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

