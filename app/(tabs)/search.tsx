import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Animated, Easing, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Filter, Sparkles, Zap, Brain, Frown, X } from 'lucide-react-native';
import { PromptCard } from '@/components/PromptCard';
import { Prompt } from '@/types/prompt';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePrompts } from '@/hooks/usePrompts';
import { useDebounce } from 'use-debounce';
import { PromptCardSkeleton } from '@/components/PromptCardSkeleton';
import { SearchResultRow } from '@/components/SearchResultRow';
import { router } from 'expo-router';
import { CategoryFilterBar } from '@/components/CategoryFilterBar';
import { SearchSuggestionCard } from '@/components/SearchSuggestionCard';
import { SearchResultCard } from '@/components/SearchResultCard';
import { useLanguage } from '@/contexts/LanguageContext';

// Animated Search Placeholder Component
function AnimatedSearchPlaceholder({ colors }: { colors: any }) {
  const searchIconAnim = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Search icon rotation
    Animated.loop(
      Animated.timing(searchIconAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Sparkle animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle1, {
          toValue: 1,
          duration: 1500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(sparkle1, {
          toValue: 0,
          duration: 1500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle2, {
          toValue: 1,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(sparkle2, {
          toValue: 0,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const searchIconRotation = searchIconAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkle1Opacity = sparkle1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const sparkle2Opacity = sparkle2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.8, 0.2],
  });

  const floatTranslateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      marginBottom: 100,
      paddingTop: -30,
    }}>
      <View style={{
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        position: 'relative',
      }}>
        {/* Sparkle animations */}
        <Animated.View style={{
          position: 'absolute',
          top: 5,
          right: 5,
          opacity: sparkle1Opacity,
          transform: [{ translateY: floatTranslateY }],
        }}>
          <Sparkles size={20} color={colors.primary} />
        </Animated.View>
        
        <Animated.View style={{
          position: 'absolute',
          bottom: 5,
          left: 5,
          opacity: sparkle2Opacity,
          transform: [{ translateY: floatTranslateY }],
        }}>
          <Zap size={18} color={colors.primary} />
        </Animated.View>
        
        <Animated.View style={{
          position: 'absolute',
          top: 35,
          left: -5,
          opacity: sparkle1Opacity,
          transform: [{ translateY: floatTranslateY }],
        }}>
          <Brain size={16} color={colors.primary} />
        </Animated.View>

        {/* Main search icon */}
        <Animated.View style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
          transform: [
            { rotate: searchIconRotation },
            { scale: pulse },
            { translateY: floatTranslateY }
          ]
        }}>
          <Search size={32} color={colors.white} />
        </Animated.View>
      </View>
      
      <Text style={{
        fontSize: 22,
        fontFamily: 'Inter-Bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
      }}>
        Discover Amazing Prompts
      </Text>
      
      <Text style={{
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 8,
      }}>
        Search through thousands of creative AI prompts
      </Text>
      
    </View>
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Prompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { t } = useLanguage();

  const {
    toggleLike,
    toggleBookmark,
  } = usePrompts();

  const handleLikeSearchResult = (promptId: string) => {
    setSearchResults(prevResults =>
      prevResults.map(p => {
        if (p.id === promptId) {
          return {
            ...p,
            isLiked: !p.isLiked,
            likes: p.isLiked ? p.likes - 1 : p.likes + 1,
          };
        }
        return p;
      })
    );
    toggleLike(promptId);
  };

  const handleBookmarkSearchResult = (promptId: string) => {
    setSearchResults(prevResults =>
      prevResults.map(p =>
        p.id === promptId ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
    toggleBookmark(promptId);
  };

  const handlePressPrompt = (prompt: Prompt) => {
    router.push(`/prompt/${prompt.id}`);
  };

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const { data, error } = await supabase.rpc('search_posts', {
            search_term: debouncedQuery,
            p_user_id: user?.id,
          });

          if (error) {
            console.error('Search error:', error);
            throw error;
          }

          const transformedData = data.map((item: any) => ({
            ...item,
            likes: item.likes_count ?? 0,
            comments: item.comments_count ?? 0,
            shares: item.shares_count ?? 0,
            isLiked: item.is_liked ?? false,
            isBookmarked: item.is_bookmarked ?? false,
            author: {
              id: item.user_id,
              name: item.display_name || item.username || item.name || 'Unknown',
              avatar: item.avatar || '', // fallback handled in PromptCard
            },
          }));

          setSearchResults(transformedData);
        } catch (err) {
          console.error('Failed to search prompts:', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    performSearch();
  }, [debouncedQuery, user?.id]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Extract unique categories from search results
  const categories = ['All', ...Array.from(new Set(searchResults.map(p => p.category).filter(Boolean)))];
  // Filter results by selected category
  const filteredResults = selectedCategory === 'All'
    ? searchResults
    : searchResults.filter(p => p.category === selectedCategory);

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
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 24,
      paddingLeft: 20,
      paddingRight: 48,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'left',
    },
    filterButton: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 12,
    },
    content: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 100,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    searchHint: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    resultsHeader: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    resultsText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 140, // Fixed padding for floating tab bar
    },
    noResultsState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 60,
    },
    noResultsText: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    noResultsHint: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    resultsContainer: {
      flex: 1,
    },
    noResultsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -100,
      paddingHorizontal: 32,
    },
    noResultsIcon: {
      marginBottom: 20,
    },
    noResultsSubText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  const isLoading = isSearching;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <View style={styles.searchContainer}>
          <View style={{ position: 'relative', flex: 1, justifyContent: 'center', height: 45 }}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={{ position: 'absolute', right: 16, top: '50%', marginTop: -9 }}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <Search 
                size={18} 
                color={colors.textSecondary} 
                style={{ 
                  position: 'absolute', 
                  right: 16, 
                  top: '50%',
                  marginTop: -9
                }} 
              />
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {searchQuery.length === 0 && !isSearching ? (
        <AnimatedSearchPlaceholder colors={colors} />
      ) : (
        <>
          {/* Category Filter Bar */}
          <CategoryFilterBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
          {isLoading ? (
            <View style={{ marginTop: 40 }}>
              <PromptCardSkeleton />
              <PromptCardSkeleton />
            </View>
          ) : filteredResults.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Frown size={48} color={colors.textSecondary} style={styles.noResultsIcon} />
              <Text style={styles.noResultsText}>{t('search.noResults')}</Text>
              <Text style={styles.noResultsSubText}>
                {t('search.trySearchingElse')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <SearchResultCard
                  title={item.prompt.length > 40 ? item.prompt.slice(0, 40) + '…' : item.prompt}
                  description={''}
                  prompt={item.prompt}
                  category={item.category}
                  tags={item.tags}
                  aiSource={item.ai_source}
                  trending={false}
                  difficulty={''}
                  onPress={() => handlePressPrompt(item)}
                  buttonLabel={t('prompt.viewDetails')}
                  colors={colors}
                />
              )}
              contentContainerStyle={{ paddingBottom: 140 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}