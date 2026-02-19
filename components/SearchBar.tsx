import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radius, fontSize } from '@/lib/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Поиск...' }: SearchBarProps) {
  const { colors, isDark } = useTheme();
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((text: string) => {
    setLocalValue(text);
  }, []);

  const handleSearch = useCallback(() => {
    onChangeText(localValue);
  }, [onChangeText, localValue]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeText('');
  }, [onChangeText]);

  const handleSubmitEditing = useCallback(() => {
    onChangeText(localValue);
  }, [onChangeText, localValue]);

  const glassBg = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.65)';

  return (
    <View style={[styles.container, { backgroundColor: glassBg, borderColor: colors.borderLight }]}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={handleSubmitEditing}
      />
      {localValue.length > 0 && (
        <Pressable onPress={handleClear}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
      <Pressable
        onPress={handleSearch}
        style={[styles.searchButton, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="search" size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  searchButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
