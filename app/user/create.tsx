import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { UserRole, USER_ROLE_LABELS } from '@/lib/types';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { validateEmail, validatePassword, validatePhone, getPasswordStrength, formatPhoneNumber } from '@/lib/validation';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const ROLES: UserRole[] = ['MANAGER', 'FLORIST', 'COURIER', 'OWNER'];

export default function CreateUserScreen() {
  const insets = useSafeAreaInsets();
  const { createUser } = useData();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return getPasswordStrength(password);
  }, [password]);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      newErrors.email = emailResult.error!;
    }
    
    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      newErrors.password = passwordResult.error!;
    }
    
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
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);

    try {
      await createUser({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        role,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось создать пользователя');
    }
    
    setIsSubmitting(false);
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
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.form, isDesktop && styles.formDesktop]}>
        <InputField
          label="Email *"
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />

        <InputField
          label="Пароль *"
          value={password}
          onChangeText={setPassword}
          placeholder="Минимум 8 символов"
          secureTextEntry
          error={errors.password}
          hint="Заглавная, строчная буква и цифра"
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

        <InputField
          label="Имя сотрудника *"
          value={name}
          onChangeText={setName}
          placeholder="Иван Иванов"
          error={errors.name}
        />

        <InputField
          label="Телефон"
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="+7 999 123 45 67"
          keyboardType="phone-pad"
          error={errors.phone}
        />

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

        <View style={styles.buttons}>
          <Button
            title="Создать сотрудника"
            onPress={handleSubmit}
            loading={isSubmitting}
            size="large"
          />
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
  form: {
    padding: 16,
    width: '100%',
  },
  formDesktop: {
    maxWidth: 500,
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
  buttons: {
    marginTop: 24,
  },
});
