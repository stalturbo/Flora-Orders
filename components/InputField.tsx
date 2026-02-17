import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

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

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.inputBorder;

  const bg = colors.inputBackground;
  const r = colors.tokens.radius.md;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: bg,
              borderColor,
              borderRadius: r,
              color: colors.text,
            },
            shouldShowToggle && styles.inputWithToggle,
            style,
          ]}
          secureTextEntry={actualSecureEntry}
          placeholderTextColor={colors.textMuted}
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
            style={({ pressed }) => [
              styles.toggleButton,
              { borderRadius: r - 2 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
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
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  inputWrapper: { position: "relative" },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputWithToggle: { paddingRight: 52 },
  toggleButton: {
    position: "absolute",
    right: 6,
    top: 6,
    bottom: 6,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
});

