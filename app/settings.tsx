import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, organization, logout } = useAuth();
  const { getEmployeeStats } = useData();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [myStats, setMyStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadMyStats = useCallback(async () => {
    if (!currentUser) return;
    setStatsLoading(true);
    const data = await getEmployeeStats(currentUser.id);
    setMyStats(data);
    setStatsLoading(false);
  }, [currentUser, getEmployeeStats]);

  useEffect(() => {
    loadMyStats();
  }, [loadMyStats]);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/login');
  };

  const cycleTheme = () => {
    Haptics.selectionAsync();
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  const getThemeLabel = () => {
    if (themeMode === 'light') return 'Светлая';
    if (themeMode === 'dark') return 'Тёмная';
    return 'Системная';
  };

  const getThemeIcon = (): keyof typeof Ionicons.glyphMap => {
    if (themeMode === 'light') return 'sunny';
    if (themeMode === 'dark') return 'moon';
    return 'phone-portrait-outline';
  };

  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const styles = createStyles(colors);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[
        { paddingBottom: insets.bottom + webBottomInset + 24 },
        isDesktop && styles.contentDesktop,
      ]}
    >
      <View style={[styles.content, isDesktop && styles.contentInnerDesktop]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Аккаунт</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color={colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{currentUser?.name}</Text>
                <Text style={styles.profileEmail}>{currentUser?.email}</Text>
                <Text style={styles.profileOrg}>{organization?.name}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Моя статистика</Text>
          <View style={styles.card}>
            {statsLoading ? (
              <View style={styles.myStatsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : myStats ? (
              <View style={styles.myStatsContent}>
                <View style={styles.myStatsRow}>
                  {(currentUser?.role === 'MANAGER' || currentUser?.role === 'OWNER') && (
                    <View style={styles.myStatItem}>
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.myStatValue}>{myStats.ordersCreated}</Text>
                      <Text style={styles.myStatLabel}>создано</Text>
                    </View>
                  )}
                  {(currentUser?.role === 'FLORIST' || currentUser?.role === 'OWNER') && (
                    <View style={styles.myStatItem}>
                      <Ionicons name="flower-outline" size={20} color="#E91E63" />
                      <Text style={styles.myStatValue}>{myStats.ordersAssembled}</Text>
                      <Text style={styles.myStatLabel}>собрано</Text>
                    </View>
                  )}
                  {(currentUser?.role === 'COURIER' || currentUser?.role === 'OWNER') && (
                    <View style={styles.myStatItem}>
                      <Ionicons name="car-outline" size={20} color="#2196F3" />
                      <Text style={styles.myStatValue}>{myStats.ordersDelivered}</Text>
                      <Text style={styles.myStatLabel}>доставлено</Text>
                    </View>
                  )}
                  <View style={styles.myStatItem}>
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.myStatValue}>{myStats.statusChanges}</Text>
                    <Text style={styles.myStatLabel}>изменений</Text>
                  </View>
                </View>
                <View style={styles.myStatsPeriod}>
                  <Text style={styles.myStatsPeriodTitle}>За неделю:</Text>
                  <View style={styles.myStatsPeriodRow}>
                    {(currentUser?.role === 'MANAGER' || currentUser?.role === 'OWNER') && (
                      <Text style={styles.myStatsPeriodValue}>
                        <Ionicons name="add-circle-outline" size={12} color={colors.primary} /> {myStats.week?.ordersCreated ?? 0}
                      </Text>
                    )}
                    {(currentUser?.role === 'FLORIST' || currentUser?.role === 'OWNER') && (
                      <Text style={styles.myStatsPeriodValue}>
                        <Ionicons name="flower-outline" size={12} color="#E91E63" /> {myStats.week?.ordersAssembled ?? 0}
                      </Text>
                    )}
                    {(currentUser?.role === 'COURIER' || currentUser?.role === 'OWNER') && (
                      <Text style={styles.myStatsPeriodValue}>
                        <Ionicons name="car-outline" size={12} color="#2196F3" /> {myStats.week?.ordersDelivered ?? 0}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <View style={styles.card}>
            <Pressable style={styles.settingRow} onPress={cycleTheme}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={getThemeIcon()} size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingLabel}>Тема оформления</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{getThemeLabel()}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Действия</Text>
          <View style={styles.card}>
            <Pressable style={styles.settingRow} onPress={handleLogout}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.warning + '15' }]}>
                  <Ionicons name="log-out-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.settingLabel}>Выйти из аккаунта</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FloraOrders v1.0.0</Text>
          <Text style={styles.footerText}>Система управления заказами</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentDesktop: {
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: 16,
  },
  contentInnerDesktop: {
    maxWidth: 600,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileOrg: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  myStatsLoading: {
    padding: 24,
    alignItems: 'center',
  },
  myStatsContent: {
    padding: 16,
    gap: 14,
  },
  myStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  myStatItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  myStatValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  myStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  myStatsPeriod: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  myStatsPeriodTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  myStatsPeriodRow: {
    flexDirection: 'row',
    gap: 16,
  },
  myStatsPeriodValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
});
