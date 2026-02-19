import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, KeyboardAvoidingView, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { InputField } from '@/components/InputField';
import { Button } from '@/components/Button';
import { validateEmail, validatePassword, getPasswordStrength } from '@/lib/validation';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!isRegister || !password) return null;
    return getPasswordStrength(password);
  }, [password, isRegister]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      newErrors.email = emailResult.error!;
    }
    
    if (isRegister) {
      const passwordResult = validatePassword(password);
      if (!passwordResult.isValid) {
        newErrors.password = passwordResult.error!;
      }
      
      if (!name.trim()) {
        newErrors.name = 'Введите ваше имя';
      }
      
      if (!organizationName.trim()) {
        newErrors.organization = 'Введите название компании';
      }
      
      if (!devPassword.trim()) {
        newErrors.devPassword = 'Введите пароль разработчика';
      }
    } else {
      if (!password) {
        newErrors.password = 'Введите пароль';
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
    setErrors({});

    try {
      if (isRegister) {
        await register(email, password, name, organizationName, devPassword);
      } else {
        await login(email, password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/home');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ general: e.message || 'Ошибка авторизации' });
    }
    
    setIsSubmitting(false);
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

  const getThemeIcon = (): keyof typeof Ionicons.glyphMap => {
    if (themeMode === 'light') return 'sunny';
    if (themeMode === 'dark') return 'moon';
    return 'phone-portrait-outline';
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const styles = createStyles(colors);

  if (showForgotPassword) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingTop: insets.top + webTopInset + 60, 
              paddingBottom: insets.bottom + webBottomInset + 40 
            }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable 
            style={styles.backButton}
            onPress={() => setShowForgotPassword(false)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="lock-open-outline" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Восстановление</Text>
            <Text style={styles.subtitle}>
              Введите email для восстановления пароля
            </Text>
          </View>

          <View style={[styles.form, isDesktop && styles.formDesktop]}>
            <InputField
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors({});
              }}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Button
              title="Отправить инструкции"
              onPress={() => {
                const result = validateEmail(email);
                if (!result.isValid) {
                  setErrors({ email: result.error! });
                  return;
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowForgotPassword(false);
                setErrors({ general: 'Инструкции отправлены на email' });
              }}
              disabled={!email}
              size="large"
              style={styles.submitButton}
            />

            <Text style={styles.infoText}>
              Обратитесь к администратору для сброса пароля
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable 
        style={[styles.themeButton, { top: insets.top + webTopInset + 16 }]}
        onPress={cycleTheme}
      >
        <Ionicons name={getThemeIcon()} size={22} color={colors.textSecondary} />
      </Pressable>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + webTopInset + 60, 
            paddingBottom: insets.bottom + webBottomInset + 40 
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="flower" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>FloraOrders</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Создать аккаунт' : 'Система управления заказами'}
          </Text>
        </View>

        <View style={[styles.form, isDesktop && styles.formDesktop]}>
          {errors.general && (
            <View style={styles.generalError}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {isRegister && (
            <>
              <InputField
                label="Название компании"
                value={organizationName}
                onChangeText={(text) => {
                  setOrganizationName(text);
                  setErrors({});
                }}
                placeholder="Мой цветочный магазин"
                autoCapitalize="words"
                error={errors.organization}
              />
              
              <InputField
                label="Ваше имя"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors({});
                }}
                placeholder="Иван Иванов"
                autoCapitalize="words"
                error={errors.name}
              />
              
              <InputField
                label="Пароль разработчика"
                value={devPassword}
                onChangeText={(text) => {
                  setDevPassword(text);
                  setErrors({});
                }}
                placeholder="Код доступа для регистрации"
                secureTextEntry
                error={errors.devPassword}
                hint="Получите у администратора системы"
              />
            </>
          )}
          
          <InputField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({});
            }}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />

          <InputField
            label="Пароль"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({});
            }}
            placeholder={isRegister ? 'Минимум 8 символов' : 'Введите пароль'}
            secureTextEntry
            error={errors.password}
            hint={isRegister ? 'Заглавная, строчная буква и цифра' : undefined}
          />

          {isRegister && password && passwordStrength && (
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

          <Button
            title={isRegister ? 'Создать аккаунт' : 'Войти'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!email || !password || (isRegister && (!name || !organizationName || !devPassword))}
            size="large"
            style={styles.submitButton}
          />

          {!isRegister && (
            <Pressable 
              style={styles.forgotButton}
              onPress={() => {
                Haptics.selectionAsync();
                setShowForgotPassword(true);
              }}
            >
              <Text style={styles.forgotText}>Забыли пароль?</Text>
            </Pressable>
          )}

          <Pressable 
            style={styles.switchButton}
            onPress={() => {
              Haptics.selectionAsync();
              setIsRegister(!isRegister);
              setErrors({});
            }}
          >
            <Text style={styles.switchText}>
              {isRegister ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
              <Text style={styles.switchLink}>
                {isRegister ? 'Войти' : 'Зарегистрироваться'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  themeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButton: {
    marginBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#4CAF7A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    width: '100%',
  },
  formDesktop: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  generalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  generalErrorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.error,
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
  submitButton: {
    marginTop: 8,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.primary,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  switchLink: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
