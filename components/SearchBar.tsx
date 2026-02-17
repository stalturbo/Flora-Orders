import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Поиск по имени, адресу, #номер…",
}: SearchBarProps) {
  const { colors } = useTheme();
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (value !== localValue) setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChangeText(text), 250);
    },
    [onChangeText]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChangeText("");
  }, [onChangeText]);

  useEffect(() => {
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, []);

  const r = colors.tokens.radius.md;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.borderLight,
          borderRadius: r,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {localValue.length > 0 && (
        <Pressable onPress={handleClear} hitSlop={10} style={styles.clear}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  clear: {
    paddingLeft: 4,
  },
});
