import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
}

export function InputField({ 
  label, 
  error, 
  hint,
  style, 
  secureTextEntry,
  showPasswordToggle = false,
  ...props 
}: InputFieldProps) {
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const shouldShowToggle = secureTextEntry || showPasswordToggle;
  const actualSecureEntry = secureTextEntry && !isPasswordVisible;

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.inputBorder;
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: getBorderColor(),
            },
            shouldShowToggle && styles.inputWithToggle,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={actualSecureEntry}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {shouldShowToggle && (
          <Pressable
            style={[styles.toggleButton, { backgroundColor: colors.inputBackground }]}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
              size={22} 
              color={colors.textMuted} 
            />
          </Pressable>
        )}
      </View>
      {hint && !error && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      )}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  inputWithToggle: {
    paddingRight: 50,
  },
  toggleButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
});
