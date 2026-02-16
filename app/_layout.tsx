import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { View, ActivityIndicator, StyleSheet } from "react-native";

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { colors } = useTheme();
  
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Назад",
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen 
        name="order/[id]" 
        options={{ 
          title: 'Заказ',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="order/create" 
        options={{ 
          title: 'Новый заказ',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="order/edit/[id]" 
        options={{ 
          title: 'Редактировать',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'Сотрудники',
        }} 
      />
      <Stack.Screen 
        name="user/create" 
        options={{ 
          title: 'Новый сотрудник',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="user/edit/[id]" 
        options={{ 
          title: 'Редактировать',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="reports" 
        options={{ 
          title: 'Отчеты',
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: 'Настройки',
        }} 
      />
      <Stack.Screen 
        name="delivery-map" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="dev-panel" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

function AppContent() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AuthProvider>
        <DataProvider>
          <ThemedStack />
        </DataProvider>
      </AuthProvider>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF7A" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <KeyboardProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1F0D',
  },
});
