import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Globe, X } from 'lucide-react-native';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageSelector({ visible, onClose }: LanguageSelectorProps) {
  const { colors } = useTheme();
  const { currentLanguage, availableLanguages, changeLanguage, t } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState(currentLanguage.code);

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage.code) {
      onClose();
      return;
    }

    try {
      setIsChanging(true);
      setSelectedLanguageCode(languageCode);
      await changeLanguage(languageCode);
      
      // Small delay to show the selection feedback
      setTimeout(() => {
        setIsChanging(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error changing language:', error);
      setIsChanging(false);
      setSelectedLanguageCode(currentLanguage.code);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
    },
    currentLanguageSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    currentLanguageLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    currentLanguageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    languagesList: {
      maxHeight: 400,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    lastLanguageItem: {
      borderBottomWidth: 0,
    },
    languageFlag: {
      fontSize: 24,
      marginRight: 12,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    languageNativeName: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    checkIcon: {
      marginLeft: 12,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface + 'CC',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.text,
      marginTop: 12,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <Text style={styles.headerTitle}>{t('language.selectLanguage')}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isChanging}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current Language */}
          <View style={styles.currentLanguageSection}>
            <Text style={styles.currentLanguageLabel}>
              {t('language.currentLanguage')}
            </Text>
            <View style={styles.currentLanguageItem}>
              <Text style={styles.languageFlag}>{currentLanguage.flag}</Text>
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: colors.primary }]}>
                  {currentLanguage.name}
                </Text>
                <Text style={[styles.languageNativeName, { color: colors.primary }]}>
                  {currentLanguage.nativeName}
                </Text>
              </View>
              <Globe size={20} color={colors.primary} />
            </View>
          </View>

          {/* Available Languages */}
          <ScrollView style={styles.languagesList} showsVerticalScrollIndicator={false}>
            {availableLanguages.map((language, index) => {
              const isSelected = selectedLanguageCode === language.code;
              const isCurrent = currentLanguage.code === language.code;
              
              return (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    index === availableLanguages.length - 1 && styles.lastLanguageItem,
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                  disabled={isChanging || isCurrent}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{language.name}</Text>
                    <Text style={styles.languageNativeName}>
                      {language.nativeName}
                    </Text>
                  </View>
                  {isSelected && !isCurrent && (
                    <View style={styles.checkIcon}>
                      {isChanging ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Check size={20} color={colors.primary} />
                      )}
                    </View>
                  )}
                  {isCurrent && (
                    <View style={styles.checkIcon}>
                      <Check size={20} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Loading Overlay */}
          {isChanging && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {t('language.changeLanguage')}...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}