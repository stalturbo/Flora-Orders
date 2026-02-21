import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { View, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

SplashScreen.preventAutoHideAsync();

function BackButton() {
  const { colors } = useTheme();
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  }, []);

  return (
    <Pressable onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingRight: 8, paddingVertical: 8 }}>
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
    </Pressable>
  );
}

function ThemedStack() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Назад",
        headerBackVisible: true,
        headerLeft: () => <BackButton />,
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
          headerLeft: undefined,
        }} 
      />
      <Stack.Screen 
        name="order/edit/[id]" 
        options={{ 
          title: 'Редактировать',
          presentation: 'modal',
          headerLeft: undefined,
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
          headerLeft: undefined,
        }} 
      />
      <Stack.Screen 
        name="user/edit/[id]" 
        options={{ 
          title: 'Редактировать',
          presentation: 'modal',
          headerLeft: undefined,
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
        name="financial-reports" 
        options={{ 
          title: 'Финансовые отчеты',
        }} 
      />
      <Stack.Screen 
        name="expenses" 
        options={{ 
          title: 'Расходы',
        }} 
      />
      <Stack.Screen 
        name="available-orders" 
        options={{ 
          title: 'Доступные заказы',
        }} 
      />
      <Stack.Screen 
        name="delivery-map" 
        options={{ 
          title: 'Карта доставок',
        }} 
      />
      <Stack.Screen 
        name="courier-map" 
        options={{ 
          title: 'Карта курьера',
        }} 
      />
      <Stack.Screen 
        name="dev-panel" 
        options={{ 
          title: 'Dev Panel',
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
