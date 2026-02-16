import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { User, UserRole, USER_ROLE_LABELS } from '@/lib/types';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { validatePhone, getPasswordStrength, formatPhoneNumber } from '@/lib/validation';
import * as Haptics from 'expo-haptics';
import { confirmAction } from '@/lib/confirm';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const ROLES: UserRole[] = ['MANAGER', 'FLORIST', 'COURIER', 'OWNER'];

export default function EditUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { users, updateUser, deleteUser, getEmployeeStats } = useData();
  const { colors } = useTheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [isActive, setIsActive] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return getPasswordStrength(password);
  }, [password]);

  useEffect(() => {
    const foundUser = users.find(u => u.id === id);
    if (foundUser) {
      setUser(foundUser);
      setName(foundUser.name);
      setPhone(foundUser.phone || '');
      setRole(foundUser.role);
      setIsActive(foundUser.isActive);
    }
  }, [id, users]);

  const loadStats = useCallback(async () => {
    if (!id) return;
    setStatsLoading(true);
    const data = await getEmployeeStats(id);
    setStats(data);
    setStatsLoading(false);
  }, [id, getEmployeeStats]);

  useEffect(() => {
    if (id && (currentUser?.role === 'OWNER' || currentUser?.id === id)) {
      loadStats();
    } else {
      setStatsLoading(false);
    }
  }, [id, currentUser, loadStats]);

  const periodStats = useMemo(() => {
    if (!stats) return null;
    return stats[selectedPeriod];
  }, [stats, selectedPeriod]);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Введите имя сотрудника';
    }
    
    if (phone) {
      const phoneResult = validatePhone(phone);
      if (!phoneResult.isValid) {
        newErrors.phone = phoneResult.error!;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: any = {
        name: name.trim(),
        phone: phone.trim() || null,
        role,
        isActive,
      };
      
      if (password) {
        updateData.password = password;
      }
      
      await updateUser(user.id, updateData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = () => {
    if (user?.id === currentUser?.id) {
      Alert.alert('Ошибка', 'Нельзя удалить самого себя');
      return;
    }
    
    confirmAction('Удалить сотрудника?', 'Это действие нельзя отменить', async () => {
      if (user) {
        await deleteUser(user.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    });
  };

  const styles = createStyles(colors);

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const canEdit = currentUser?.role === 'OWNER';

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[
        { paddingBottom: insets.bottom + webBottomInset + 24 },
        isDesktop && styles.contentDesktop,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.form, isDesktop && styles.formDesktop]}>
        <View style={styles.emailBadge}>
          <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        {(currentUser?.role === 'OWNER' || currentUser?.id === id) && (
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>
              <Ionicons name="stats-chart" size={16} color={colors.primary} /> Статистика
            </Text>
            
            {statsLoading ? (
              <View style={styles.statsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : stats ? (
              <>
                <View style={styles.periodSelector}>
                  {(['today', 'week', 'month'] as const).map((period) => (
                    <Pressable
                      key={period}
                      style={[
                        styles.periodButton,
                        selectedPeriod === period && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        selectedPeriod === period && { color: '#fff' },
                      ]}>
                        {period === 'today' ? 'Сегодня' : period === 'week' ? 'Неделя' : 'Месяц'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.statsGrid}>
                  {(user.role === 'MANAGER' || user.role === 'OWNER') && (
                    <View style={styles.statsCard}>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      <Text style={styles.statsCardValue}>{periodStats?.ordersCreated ?? 0}</Text>
                      <Text style={styles.statsCardLabel}>Создано</Text>
                    </View>
                  )}
                  {(user.role === 'FLORIST' || user.role === 'OWNER') && (
                    <View style={styles.statsCard}>
                      <Ionicons name="flower-outline" size={22} color="#E91E63" />
                      <Text style={styles.statsCardValue}>{periodStats?.ordersAssembled ?? 0}</Text>
                      <Text style={styles.statsCardLabel}>Собрано</Text>
                    </View>
                  )}
                  {(user.role === 'COURIER' || user.role === 'OWNER') && (
                    <View style={styles.statsCard}>
                      <Ionicons name="car-outline" size={22} color="#2196F3" />
                      <Text style={styles.statsCardValue}>{periodStats?.ordersDelivered ?? 0}</Text>
                      <Text style={styles.statsCardLabel}>Доставлено</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statsDivider} />
                <Text style={styles.statsSubtitle}>Общие показатели</Text>

                <View style={styles.totalStatsGrid}>
                  {(user.role === 'MANAGER' || user.role === 'OWNER') && (
                    <>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                          <Text style={styles.totalStatLabel}>Всего создано</Text>
                        </View>
                        <Text style={styles.totalStatValue}>{stats.ordersCreated}</Text>
                      </View>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="cash-outline" size={18} color={colors.primary} />
                          <Text style={styles.totalStatLabel}>Выручка</Text>
                        </View>
                        <Text style={[styles.totalStatValue, { color: colors.primary }]}>
                          {stats.totalRevenueAsManager.toLocaleString('ru-RU')} ₽
                        </Text>
                      </View>
                    </>
                  )}
                  {(user.role === 'FLORIST' || user.role === 'OWNER') && (
                    <>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="flower-outline" size={18} color={colors.textMuted} />
                          <Text style={styles.totalStatLabel}>Всего собрано</Text>
                        </View>
                        <Text style={styles.totalStatValue}>{stats.ordersAssembled}</Text>
                      </View>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />
                          <Text style={styles.totalStatLabel}>Назначено заказов</Text>
                        </View>
                        <Text style={styles.totalStatValue}>{stats.assignedAsFlorist}</Text>
                      </View>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="hourglass-outline" size={18} color="#FF9800" />
                          <Text style={styles.totalStatLabel}>Активных</Text>
                        </View>
                        <Text style={[styles.totalStatValue, { color: '#FF9800' }]}>{stats.activeAsFlorist}</Text>
                      </View>
                    </>
                  )}
                  {(user.role === 'COURIER' || user.role === 'OWNER') && (
                    <>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="car-outline" size={18} color={colors.textMuted} />
                          <Text style={styles.totalStatLabel}>Всего доставлено</Text>
                        </View>
                        <Text style={styles.totalStatValue}>{stats.ordersDelivered}</Text>
                      </View>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="navigate-outline" size={18} color={colors.textMuted} />
                          <Text style={styles.totalStatLabel}>Назначено доставок</Text>
                        </View>
                        <Text style={styles.totalStatValue}>{stats.assignedAsCourier}</Text>
                      </View>
                      <View style={styles.totalStatRow}>
                        <View style={styles.totalStatLeft}>
                          <Ionicons name="hourglass-outline" size={18} color="#FF9800" />
                          <Text style={styles.totalStatLabel}>В процессе</Text>
                        </View>
                        <Text style={[styles.totalStatValue, { color: '#FF9800' }]}>{stats.activeAsCourier}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.totalStatRow}>
                    <View style={styles.totalStatLeft}>
                      <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                      <Text style={styles.totalStatLabel}>Отменено</Text>
                    </View>
                    <Text style={[styles.totalStatValue, { color: colors.error }]}>{stats.canceledByUser}</Text>
                  </View>
                  <View style={styles.totalStatRow}>
                    <View style={styles.totalStatLeft}>
                      <Ionicons name="swap-horizontal-outline" size={18} color={colors.textMuted} />
                      <Text style={styles.totalStatLabel}>Изменений статусов</Text>
                    </View>
                    <Text style={styles.totalStatValue}>{stats.statusChanges}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        )}

        <InputField
          label="Имя сотрудника *"
          value={name}
          onChangeText={setName}
          placeholder="Иван Иванов"
          error={errors.name}
          editable={canEdit}
        />

        <InputField
          label="Телефон"
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="+7 999 123 45 67"
          keyboardType="phone-pad"
          editable={canEdit}
          error={errors.phone}
        />

        <InputField
          label="Новый пароль"
          value={password}
          onChangeText={setPassword}
          placeholder="Оставьте пустым, чтобы не менять"
          secureTextEntry
          editable={canEdit}
        />

        {password && passwordStrength && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.strengthBar,
                    { 
                      backgroundColor: level <= passwordStrength.score 
                        ? passwordStrength.color 
                        : colors.border 
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
        )}

        {canEdit && (
          <>
            <Text style={styles.label}>Роль *</Text>
            <Pressable
              style={styles.picker}
              onPress={() => setShowRolePicker(!showRolePicker)}
            >
              <Text style={styles.pickerText}>
                {USER_ROLE_LABELS[role]}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>

            {showRolePicker && (
              <View style={styles.pickerList}>
                {ROLES.map((r, index) => (
                  <Pressable
                    key={r}
                    style={[
                      styles.pickerOption,
                      role === r && styles.pickerOptionSelected,
                      index === ROLES.length - 1 && styles.pickerOptionLast
                    ]}
                    onPress={() => {
                      setRole(r);
                      setShowRolePicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{USER_ROLE_LABELS[r]}</Text>
                    {role === r && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable
              style={styles.toggleRow}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.toggleLabel}>Активный аккаунт</Text>
              <View style={[styles.toggle, isActive && styles.toggleActive]}>
                <View style={[styles.toggleKnob, isActive && styles.toggleKnobActive]} />
              </View>
            </Pressable>
          </>
        )}

        <View style={styles.buttons}>
          <Button
            title="Сохранить изменения"
            onPress={handleSubmit}
            loading={isSubmitting}
            size="large"
            disabled={!canEdit}
          />
          {canEdit && user.id !== currentUser?.id && (
            <Button
              title="Удалить сотрудника"
              onPress={handleDelete}
              variant="danger"
              size="large"
            />
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  form: {
    padding: 16,
    width: '100%',
  },
  formDesktop: {
    maxWidth: 500,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    minWidth: 60,
    textAlign: 'right',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  pickerList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginTop: -12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionLast: {
    borderBottomWidth: 0,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '15',
  },
  pickerOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  buttons: {
    marginTop: 24,
    gap: 12,
  },
  statsSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 14,
  },
  statsLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statsCardValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  statsCardLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  statsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  statsSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  totalStatsGrid: {
    gap: 2,
  },
  totalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  totalStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  totalStatValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
});
