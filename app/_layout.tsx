import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { getHasSeenWelcome, resetHasSeenWelcome } from '@/utils/onboarding';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  useFrameworkReady();
  const { isLoggedIn, isLoading, hasSeenWelcome } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    // If we just came from onboarding, the state might not have propagated yet.
    // The router param acts as a signal to skip the guard for one cycle.
    if (params.onboardingJustCompleted === 'true') {
      return;
    }

    if (isLoading) {
      return;
    }

    const inWelcomeRoute = segments[0] === 'welcome';

    // If onboarding is not complete, redirect to the welcome screen
    if (!hasSeenWelcome && !inWelcomeRoute) {
      router.replace('/welcome');
    }
    
  }, [isLoading, hasSeenWelcome, segments, router, params.onboardingJustCompleted]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="prompt/[id]" />
      <Stack.Screen name="edit-post/[id]" />
      <Stack.Screen name="post-activity/[id]" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="avatar-gallery" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="ai-assistant" />
      <Stack.Screen name="smart-suggestions" />
      <Stack.Screen name="video-generator" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AvatarProvider>
            <InitialLayout />
            <StatusBar
              style="auto"
              backgroundColor="transparent"
              translucent={Platform.OS === 'android'}
            />
          </AvatarProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
