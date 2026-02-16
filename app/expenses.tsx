import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmAction } from '@/lib/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import {
  BusinessExpense,
  BusinessExpenseCategory,
  BUSINESS_EXPENSE_CATEGORY_LABELS,
} from '@/lib/types';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const CATEGORY_ICONS: Record<BusinessExpenseCategory, keyof typeof Ionicons.glyphMap> = {
  TAXES: 'receipt-outline',
  RENT: 'home-outline',
  SALARY: 'people-outline',
  SUPPLIES: 'cube-outline',
  MARKETING: 'megaphone-outline',
  TRANSPORT: 'car-outline',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

const ALL_CATEGORIES: BusinessExpenseCategory[] = [
  'TAXES', 'RENT', 'SALARY', 'SUPPLIES', 'MARKETING', 'TRANSPORT', 'OTHER',
];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BusinessExpenseCategory>('OTHER');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.businessExpenses.list();
      setExpenses(data);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось загрузить расходы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const total = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { items: BusinessExpense[]; subtotal: number }> = {};
    for (const exp of expenses) {
      if (!groups[exp.category]) {
        groups[exp.category] = { items: [], subtotal: 0 };
      }
      groups[exp.category].items.push(exp);
      groups[exp.category].subtotal += exp.amount;
    }
    const sorted = ALL_CATEGORIES
      .filter(cat => groups[cat])
      .map(cat => ({ category: cat, ...groups[cat] }));
    return sorted;
  }, [expenses]);

  const handleAdd = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Ошибка', 'Введите комментарий');
      return;
    }
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.businessExpenses.add({
        category: selectedCategory,
        amount: numAmount,
        comment: comment.trim(),
        date: Date.now(),
      });
      setModalVisible(false);
      setAmount('');
      setComment('');
      setSelectedCategory('OTHER');
      await loadExpenses();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось добавить расход');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    confirmAction('Удалить расход?', 'Это действие нельзя отменить', async () => {
      try {
        setDeletingId(id);
        await api.businessExpenses.delete(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadExpenses();
      } catch (e: any) {
        Alert.alert('Ошибка', e.message || 'Не удалось удалить расход');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const formatAmount = (val: number) => {
    return val.toLocaleString('ru-RU') + ' ₽';
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + webBottomInset + 24 },
          isDesktop && styles.contentDesktop,
        ]}
      >
        <View style={[styles.content, isDesktop && styles.contentInnerDesktop]}>
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Общие расходы</Text>
                <Text style={styles.totalValue}>{formatAmount(total)}</Text>
              </View>
              <Pressable
                style={styles.addButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Нет расходов</Text>
              <Text style={styles.emptySubtext}>Нажмите «+» чтобы добавить первый расход</Text>
            </View>
          ) : (
            groupedExpenses.map((group) => (
              <View key={group.category} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons
                        name={CATEGORY_ICONS[group.category]}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.sectionTitle}>
                      {BUSINESS_EXPENSE_CATEGORY_LABELS[group.category]}
                    </Text>
                  </View>
                  <Text style={styles.sectionSubtotal}>{formatAmount(group.subtotal)}</Text>
                </View>

                {group.items.map((expense) => (
                  <View key={expense.id} style={styles.expenseCard}>
                    <View style={styles.expenseContent}>
                      <Text style={styles.expenseComment} numberOfLines={2}>
                        {expense.comment}
                      </Text>
                      <Text style={styles.expenseDate}>
                        {format(new Date(expense.date), 'd MMMM yyyy', { locale: ru })}
                      </Text>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>{formatAmount(expense.amount)}</Text>
                      <TouchableOpacity
                        onPress={() => handleDelete(expense.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        activeOpacity={0.5}
                        style={styles.deleteBtn}
                      >
                        {deletingId === expense.id ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новый расход</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Категория</Text>
              <View style={styles.categoryGrid}>
                {ALL_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedCategory(cat);
                    }}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[cat]}
                      size={16}
                      color={selectedCategory === cat ? '#fff' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && { color: '#fff' },
                      ]}
                    >
                      {BUSINESS_EXPENSE_CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <InputField
                label="Сумма (₽)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
              />

              <InputField
                label="Комментарий"
                value={comment}
                onChangeText={setComment}
                placeholder="Описание расхода"
                multiline
              />

              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                <Text style={styles.dateText}>
                  {format(new Date(), 'd MMMM yyyy', { locale: ru })}
                </Text>
              </View>

              <Button
                title="Добавить расход"
                onPress={handleAdd}
                loading={submitting}
                disabled={submitting}
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
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
    totalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
      marginBottom: 4,
    },
    totalValue: {
      fontSize: 28,
      fontFamily: 'Inter_600SemiBold',
      color: colors.text,
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.text,
      marginTop: 8,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.text,
    },
    sectionSubtotal: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primary,
    },
    expenseCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    expenseContent: {
      flex: 1,
      marginRight: 12,
    },
    expenseComment: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.text,
      marginBottom: 4,
    },
    expenseDate: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
    expenseRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    expenseAmount: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.warning,
    },
    deleteBtn: {
      padding: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter_600SemiBold',
      color: colors.text,
    },
    fieldLabel: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.text,
      marginBottom: 10,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    categoryChipText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
      paddingVertical: 8,
    },
    dateText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
  });
