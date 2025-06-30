import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Create a platform-aware storage adapter for Supabase
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      if (typeof window !== 'undefined') {
        return Promise.resolve(window.localStorage.getItem(key));
      }
      return Promise.resolve(null);
    }
    // Use SecureStore for native platforms
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      }
      return Promise.resolve();
    }
    // Use SecureStore for native platforms
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      }
      return Promise.resolve();
    }
    // Use SecureStore for native platforms
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please check your .env file and ensure you have set your Supabase project URL and anon key.'
  );
}

// Use placeholder values if environment variables are missing to prevent crashes
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient<Database>(finalUrl, finalKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
