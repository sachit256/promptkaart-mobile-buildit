import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Filter, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { PromptCard } from '@/components/PromptCard';
import { AnimatedLoader } from '@/components/AnimatedLoader';
import { supabase } from '@/lib/supabase';
import { Prompt } from '@/types/prompt';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/contexts/LanguageContext';

type BookmarkedPrompt = {
  id: string;
  prompt: string;
  ai_source: string;
  images: string[];
  category: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  is_liked: boolean;
  is_bookmarked: boolean;
  author: {
    id: string;
    display_name?: string;
    username?: string;
    name: string;
    avatar: string;
  };
};

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { user, isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [favoritePrompts, setFavoritePrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to auth if not logged in
  React.useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth');
    }
  }, [isLoggedIn]);

  const fetchFavorites = useCallback(
    async (showRefreshing = false) => {
      if (!user?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const { data, error: rpcError } = await supabase.rpc(
          'get_bookmarked_posts',
          {
            p_user_id: user.id,
          }
        );

        if (rpcError) throw rpcError;

        if (!data) {
          setFavoritePrompts([]);
          return;
        }

        const transformedPrompts: Prompt[] = (data as BookmarkedPrompt[]).map(
          (p) => ({
            id: p.id,
            prompt: p.prompt,
            ai_source: ['chatgpt', 'grok', 'gemini'].includes(p.ai_source)
              ? (p.ai_source as Prompt['ai_source'])
              : 'chatgpt',
            images: p.images,
            category: p.category,
            tags: p.tags,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            isLiked: p.is_liked,
            isBookmarked: p.is_bookmarked,
            createdAt: p.created_at,
            author: {
              id: p.author.id || 'unknown-author',
              name: p.author.display_name || p.author.username || p.author.name || 'Deleted User',
              avatar:
                p.author.avatar ||
                'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
            },
          })
        );

        setFavoritePrompts(transformedPrompts);
      } catch (err) {
        console.error('Error fetching favorites:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch favorites'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  // Reverted to original event handlers to maintain functionality
  const handleLike = async (promptId: string) => {
    if (!user?.id) {
      console.error('No user ID for like action');
      return;
    }

    try {
      const prompt = favoritePrompts.find((p) => p.id === promptId);
      if (!prompt) return;

      const newLikedState = !prompt.isLiked;
      const newLikesCount = newLikedState ? prompt.likes + 1 : prompt.likes - 1;

      // Add haptic feedback for better UX
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Optimistic update - update UI immediately
      setFavoritePrompts((prev) =>
        prev.map((p) =>
          p.id === promptId
            ? { ...p, isLiked: newLikedState, likes: newLikesCount }
            : p
        )
      );

      if (prompt.isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', promptId);

        if (error) {
          // Revert optimistic update on error
          setFavoritePrompts((prev) =>
            prev.map((p) =>
              p.id === promptId
                ? { ...p, isLiked: prompt.isLiked, likes: prompt.likes }
                : p
            )
          );
          throw error;
        }
      } else {
        // Like
        const { error } = await supabase.from('likes').insert({
          user_id: user.id,
          post_id: promptId,
        });

        if (error) {
          // Revert optimistic update on error
          setFavoritePrompts((prev) =>
            prev.map((p) =>
              p.id === promptId
                ? { ...p, isLiked: prompt.isLiked, likes: prompt.likes }
                : p
            )
          );
          throw error;
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleBookmark = async (promptId: string) => {
    if (!user?.id) {
      console.error('No user ID for bookmark action');
      return;
    }

    try {
      // Optimistically remove from favorites immediately
      setFavoritePrompts((prev) => prev.filter((p) => p.id !== promptId));

      // Remove bookmark (since this is favorites screen, we're removing from favorites)
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', promptId);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing bookmark:', err);
      // Revert optimistic update on error
      fetchFavorites();
    }
  };

  const handleShare = (promptId: string) => {
    // TODO: Implement share functionality
    console.log('Share prompt:', promptId);
  };

  const onRefresh = () => {
    fetchFavorites(true);
  };

  const handleFilterPress = useCallback(() => {
    // TODO: Implement filter functionality
    console.log('Filter pressed');
  }, []);

  // Memoized styles to prevent recreation on every render
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    },
    filterButton: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
      padding: 8,
    },
    content: {
      flex: 1,
    },
    statsContainer: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    statsText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 140, // Fixed padding for floating tab bar
    },

    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 100,
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorText: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    errorDescription: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    retryButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 100,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    realtimeIndicator: {
      position: 'absolute',
      top: Platform.OS === 'android' ? insets.top + 60 : insets.top + 64,
      right: 20,
      backgroundColor: colors.success,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      opacity: 0.8,
    },
    realtimeText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: colors.white,
    },
  }), [colors, insets.top]);

  // Memoized prompt components to prevent recreation
  const promptComponents = useMemo(() => 
    favoritePrompts.map((prompt) => (
      <PromptCard
        key={prompt.id}
        prompt={prompt}
        onLike={handleLike}
        onShare={handleShare}
        onBookmark={handleBookmark}
      />
    )),
    [favoritePrompts, handleLike, handleShare, handleBookmark]
  );

  // Set up real-time subscriptions
  useEffect(() => {
    if (user?.id && isLoggedIn) {
      // Initial fetch
      fetchFavorites();

      // Set up real-time subscriptions
      const bookmarksChannel = supabase
        .channel(`favorites_bookmarks_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Bookmarks change detected for favorites:', payload);

            // Add a small delay to ensure database consistency
            setTimeout(() => {
              if (
                payload.eventType === 'DELETE' &&
                payload.old.user_id === user.id
              ) {
                // Remove the post from favorites immediately
                setFavoritePrompts((prev) =>
                  prev.filter((p) => p.id !== payload.old.post_id)
                );
              } else if (
                payload.eventType === 'INSERT' &&
                payload.new.user_id === user.id
              ) {
                // Refetch to get the new bookmarked post
                fetchFavorites();
              }
            }, 100);
          }
        )
        .subscribe();

      const likesChannel = supabase
        .channel(`favorites_likes_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'likes',
          },
          (payload) => {
            console.log('Likes change detected for favorites:', payload);

            // Skip real-time updates for the current user's actions since we handle them optimistically
            if ((payload.new && 'user_id' in payload.new && payload.new.user_id === user?.id) || 
                (payload.old && 'user_id' in payload.old && payload.old.user_id === user?.id)) {
              console.log('Skipping real-time update for current user action');
              return;
            }

            setTimeout(() => {
              if (payload.eventType === 'INSERT' && payload.new && 'post_id' in payload.new) {
                setFavoritePrompts((prev) =>
                  prev.map((prompt) => {
                    if (prompt.id === payload.new.post_id) {
                      return {
                        ...prompt,
                        likes: prompt.likes + 1,
                        isLiked:
                          payload.new.user_id === user?.id
                            ? true
                            : prompt.isLiked,
                      };
                    }
                    return prompt;
                  })
                );
              } else if (
                payload.eventType === 'DELETE' &&
                payload.old && 'post_id' in payload.old
              ) {
                setFavoritePrompts((prev) =>
                  prev.map((prompt) => {
                    if (prompt.id === payload.old.post_id) {
                      return {
                        ...prompt,
                        likes: Math.max(prompt.likes - 1, 0),
                        isLiked:
                          payload.old.user_id === user?.id
                            ? false
                            : prompt.isLiked,
                      };
                    }
                    return prompt;
                  })
                );
              }
            }, 100);
          }
        )
        .subscribe();

      const commentsChannel = supabase
        .channel(`favorites_comments_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
          },
          (payload) => {
            console.log('Comments change detected for favorites:', payload);

            setTimeout(() => {
              if (payload.eventType === 'INSERT' && payload.new.post_id) {
                setFavoritePrompts((prev) =>
                  prev.map((prompt) => {
                    if (prompt.id === payload.new.post_id) {
                      return {
                        ...prompt,
                        comments: prompt.comments + 1,
                      };
                    }
                    return prompt;
                  })
                );
              } else if (
                payload.eventType === 'DELETE' &&
                payload.old.post_id
              ) {
                setFavoritePrompts((prev) =>
                  prev.map((prompt) => {
                    if (prompt.id === payload.old.post_id) {
                      return {
                        ...prompt,
                        comments: Math.max(prompt.comments - 1, 0),
                      };
                    }
                    return prompt;
                  })
                );
              }
            }, 100);
          }
        )
        .subscribe();

      const postsChannel = supabase
        .channel(`favorites_posts_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
          },
          (payload) => {
            console.log('Posts change detected for favorites:', payload);

            // Skip updates that are only related to like/comment/bookmark count changes
            // since we handle those optimistically in their respective channels
            if (payload.new && payload.old) {
              const newCounts = {
                likes_count: payload.new.likes_count,
                comments_count: payload.new.comments_count,
                shares_count: payload.new.shares_count
              };
              const oldCounts = {
                likes_count: payload.old.likes_count,
                comments_count: payload.old.comments_count,
                shares_count: payload.old.shares_count
              };
              
              // Check if only counts changed (and no content changes)
              const onlyCountsChanged = 
                JSON.stringify(newCounts) !== JSON.stringify(oldCounts) &&
                payload.new.prompt === payload.old.prompt &&
                payload.new.images === payload.old.images &&
                payload.new.category === payload.old.category &&
                payload.new.tags === payload.old.tags &&
                payload.new.title === payload.old.title &&
                payload.new.description === payload.old.description &&
                payload.new.content === payload.old.content &&
                payload.new.author_id === payload.old.author_id &&
                payload.new.created_at === payload.old.created_at;
              
              if (onlyCountsChanged) {
                console.log('Skipping favorites posts update - only counts changed, handled by other channels');
                return;
              }
            }

            // Only update if the post content was actually updated (not just count changes)
            if (payload.new && payload.old && (
              payload.new.prompt !== payload.old.prompt || 
              payload.new.images !== payload.old.images ||
              payload.new.category !== payload.old.category ||
              payload.new.tags !== payload.old.tags ||
              payload.new.title !== payload.old.title ||
              payload.new.description !== payload.old.description ||
              payload.new.content !== payload.old.content ||
              payload.new.author_id !== payload.old.author_id
            )) {
              console.log('Post content changed in favorites, updating...');
              setTimeout(() => {
                if (payload.new) {
                  setFavoritePrompts((prev) =>
                    prev.map((prompt) => {
                      if (prompt.id === payload.new.id) {
                        return {
                          ...prompt,
                          prompt: payload.new.prompt,
                          category: payload.new.category,
                          tags: payload.new.tags,
                          images: payload.new.images,
                          likes: payload.new.likes_count || 0,
                          comments: payload.new.comments_count || 0,
                          shares: payload.new.shares_count || 0,
                        };
                      }
                      return prompt;
                    })
                  );
                }
              }, 100);
            } else {
              console.log('Skipping favorites posts update - no meaningful content changes detected');
            }
          }
        )
        .subscribe();

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(bookmarksChannel);
        supabase.removeChannel(likesChannel);
        supabase.removeChannel(commentsChannel);
        supabase.removeChannel(postsChannel);
      };
    }
  }, [user?.id, isLoggedIn, fetchFavorites]);

  if (!isLoggedIn) {
    return null; // or loading spinner
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <AnimatedLoader fullScreen={false} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle
            size={64}
            color={colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{t('favorites.failedToLoad')}</Text>
          <Text style={styles.errorDescription}>
            {t('favorites.checkConnection')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchFavorites()}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {favoritePrompts.length > 0 ? (
          <>
            {/* Stats */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {t('favorites.favoritePrompts', {
                  count: favoritePrompts.length,
                })}
              </Text>
            </View>

            {/* Favorites List */}
            <FlatList
              data={favoritePrompts}
              renderItem={({ item }) => (
                <PromptCard
                  prompt={item}
                  onLike={handleLike}
                  onShare={handleShare}
                  onBookmark={handleBookmark}
                />
              )}
              keyExtractor={(item) => item.id}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              // Performance optimizations
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={10}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Heart
              size={64}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>{t('favorites.noFavorites')}</Text>
            <Text style={styles.emptyDescription}>
              {t('favorites.startExploring')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}