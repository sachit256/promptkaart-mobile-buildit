import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '@/lib/i18n';

type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

interface LanguageContextType {
  currentLanguage: Language;
  availableLanguages: Language[];
  changeLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
}

const STORAGE_KEY = 'selected_language';

const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(AVAILABLE_LANGUAGES[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Check for stored language preference
      const storedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      
      let languageCode = 'en'; // Default to English
      
      if (storedLanguage) {
        languageCode = storedLanguage;
      } else {
        // Use device locale as fallback
        const deviceLocale = Localization.getLocales()[0];
        const deviceLanguageCode = deviceLocale.languageCode;
        
        // Check if device language is supported
        const supportedLanguage = AVAILABLE_LANGUAGES.find(
          lang => lang.code === deviceLanguageCode
        );
        
        if (supportedLanguage) {
          languageCode = deviceLanguageCode;
        }
      }
      
      const selectedLanguage = AVAILABLE_LANGUAGES.find(
        lang => lang.code === languageCode
      ) || AVAILABLE_LANGUAGES[0];
      
      setCurrentLanguage(selectedLanguage);
      await i18n.changeLanguage(languageCode);
    } catch (error) {
      console.error('Error initializing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode: string) => {
    try {
      const selectedLanguage = AVAILABLE_LANGUAGES.find(
        lang => lang.code === languageCode
      );
      
      if (selectedLanguage) {
        setCurrentLanguage(selectedLanguage);
        await i18n.changeLanguage(languageCode);
        await AsyncStorage.setItem(STORAGE_KEY, languageCode);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        availableLanguages: AVAILABLE_LANGUAGES,
        changeLanguage,
        t,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}