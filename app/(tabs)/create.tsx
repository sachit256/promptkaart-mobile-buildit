import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Image, Type, Sparkles, Bot, Lightbulb } from 'lucide-react-native';
import { Video } from 'lucide-react-native';
import { router } from 'expo-router';

export default function CreateScreen() {
  const { colors } = useTheme();
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const handleCreatePrompt = () => {
    if (!isLoggedIn) {
      // Navigate to auth if user is not logged in
      router.push('/auth');
    } else {
      // Navigate to create post screen
      router.push('/create-post');
    }
  };

  const handleAIAssistant = () => {
    if (!isLoggedIn) {
      router.push('/auth');
    } else {
      router.push('/ai-assistant');
    }
  };

  const handleSmartSuggestions = () => {
    if (!isLoggedIn) {
      router.push('/auth');
    } else {
      router.push('/smart-suggestions');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 140, // Fixed padding for floating tab bar
    },
    createOptions: {
      gap: 16,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    optionIcon: {
      marginRight: 12,
    },
    optionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    optionDescription: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },
    optionButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    optionButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
    },
    featuredSection: {
      marginTop: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 16,
    },
    featureCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureText: {
      flex: 1,
      marginRight: 12,
    },
    featureTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t('create.title')}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.createOptions}>
            <TouchableOpacity style={styles.optionCard} onPress={handleCreatePrompt}>
              <View style={styles.optionHeader}>
                <Type size={24} color={colors.primary} style={styles.optionIcon} />
                <Text style={styles.optionTitle}>{t('create.yourPrompt')}</Text>
              </View>
              <Text style={styles.optionDescription}>
                {t('create.yourPromptDesc')}
              </Text>
              <TouchableOpacity style={styles.optionButton} onPress={handleCreatePrompt}>
                <Text style={styles.optionButtonText}>{t('create.createYourPrompt')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={handleAIAssistant}>
              <View style={styles.optionHeader}>
                <Bot size={24} color={colors.secondary} style={styles.optionIcon} />
                <Text style={styles.optionTitle}>{t('create.aiAssistant')}</Text>
              </View>
              <Text style={styles.optionDescription}>
                {t('create.aiAssistantDesc')}
              </Text>
              <TouchableOpacity style={[styles.optionButton, { backgroundColor: colors.secondary }]} onPress={handleAIAssistant}>
                <Text style={styles.optionButtonText}>{t('create.chatWithAI')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={handleSmartSuggestions}>
              <View style={styles.optionHeader}>
                <Lightbulb size={24} color={colors.accent} style={styles.optionIcon} />
                <Text style={styles.optionTitle}>{t('create.smartSuggestions')}</Text>
              </View>
              <Text style={styles.optionDescription}>
                {t('create.smartSuggestionsDesc')}
              </Text>
              <TouchableOpacity style={[styles.optionButton, { backgroundColor: colors.accent }]} onPress={handleSmartSuggestions}>
                <Text style={styles.optionButtonText}>{t('create.browseSuggestions')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionCard} 
              onPress={() => router.push('/video-generator')}
            >
              <View style={styles.optionHeader}>
                <Video size={24} color={colors.secondary} style={styles.optionIcon} />
                <Text style={styles.optionTitle}>{t('videoGenerator.title')}</Text>
              </View>
              <Text style={styles.optionDescription}>
                {t('videoGenerator.description')}
              </Text>
              <TouchableOpacity 
                style={[styles.optionButton, { backgroundColor: colors.secondary }]} 
                onPress={() => router.push('/video-generator')}
              >
                <Text style={styles.optionButtonText}>{t('videoGenerator.generateVideo')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/conversation')}>
              <View style={styles.optionHeader}>
                <Video size={24} color={colors.primary} style={styles.optionIcon} />
                <Text style={styles.optionTitle}>AI Video Conversation</Text>
              </View>
              <Text style={styles.optionDescription}>
                Chat with an AI and receive video responses in a conversational format. Try multi-turn, interactive video chat!
              </Text>
              <TouchableOpacity style={styles.optionButton} onPress={() => router.push('/conversation')}>
                <Text style={styles.optionButtonText}>Start Conversation</Text>
              </TouchableOpacity>
            </TouchableOpacity> */}
          </View>

          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>{t('create.proTip')}</Text>
            <View style={styles.featureCard}>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>
                  {isLoggedIn ? t('create.aiCreativityAwaits') : t('create.signInToUnlock')}
                </Text>
                <Text style={styles.featureDescription}>
                  {isLoggedIn 
                    ? t('create.useAIAssistant')
                    : t('create.loginToAccess')
                  }
                </Text>
              </View>
              <Sparkles size={24} color={colors.primary} />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}