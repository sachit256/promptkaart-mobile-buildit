import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Frown } from 'lucide-react-native';
import { PromptCard } from '@/components/PromptCard';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Prompt } from '@/types/prompt';
import * as Haptics from 'expo-haptics';
import { AnimatedLoader } from '@/components/AnimatedLoader';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomeScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to store current prompts state for event handlers
  const promptsRef = useRef<Prompt[]>([]);
  
  // Update ref whenever prompts change
  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  const fetchPosts = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      console.log('[HomeScreen] fetchPosts called. user:', user, 'isLoggedIn:', isLoggedIn, 'Platform:', Platform.OS);
      const { data, error: rpcError } = await supabase.rpc('get_all_posts', {
        p_user_id: user?.id || null,
      });
      console.log('[HomeScreen] supabase.rpc get_all_posts response:', { data, rpcError });
      if (rpcError) throw rpcError;
      if (!data) {
        console.log('[HomeScreen] No data returned from get_all_posts.');
        setPrompts([]);
        return;
      }
      const transformedPrompts: Prompt[] = data.map((p: any) => ({
        id: p.id,
        prompt: p.prompt,
        ai_source: ['chatgpt', 'grok', 'gemini', 'midjourney'].includes(p.ai_source)
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
          id: p.author?.id || 'unknown-author',
          name: p.author?.display_name || p.author?.username || p.author?.name || 'Deleted User',
          avatar: p.author?.avatar || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
        },
      }));
      setPrompts(transformedPrompts);
      console.log('[HomeScreen] Prompts set:', transformedPrompts.length);
    } catch (err) {
      console.error('[HomeScreen] Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Reverted to original event handlers to maintain functionality
  const handleLike = useCallback(async (promptId: string) => {
    if (!user?.id) {
      router.push('/auth');
      return;
    }

    try {
      // Optimistic update
      setPrompts(prev => {
        const prompt = prev.find(p => p.id === promptId);
        if (!prompt) return prev;

        const newLikedState = !prompt.isLiked;
        const newLikesCount = newLikedState ? prompt.likes + 1 : prompt.likes - 1;

        // Add haptic feedback for better UX
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        return prev.map(p => 
          p.id === promptId 
            ? { ...p, isLiked: newLikedState, likes: newLikesCount }
            : p
        );
      });

      // Get current prompt state for API call from ref
      const currentPrompts = promptsRef.current;
      const prompt = currentPrompts.find(p => p.id === promptId);
      if (!prompt) return;

      if (prompt.isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', promptId);
        
        if (error) {
          // Revert optimistic update on error
          setPrompts(prev => prev.map(p => 
            p.id === promptId 
              ? { ...p, isLiked: prompt.isLiked, likes: prompt.likes }
              : p
          ));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: promptId });
        
        if (error) {
          // Revert optimistic update on error
          setPrompts(prev => prev.map(p => 
            p.id === promptId 
              ? { ...p, isLiked: prompt.isLiked, likes: prompt.likes }
              : p
          ));
          throw error;
        }
      }
      
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }, [user?.id]);

  const handleBookmark = useCallback(async (promptId: string) => {
    if (!user?.id) {
      router.push('/auth');
      return;
    }

    try {
      // Optimistic update
      setPrompts(prev => {
        const prompt = prev.find(p => p.id === promptId);
        if (!prompt) return prev;

        const newBookmarkedState = !prompt.isBookmarked;
        
        return prev.map(p => 
          p.id === promptId 
            ? { ...p, isBookmarked: newBookmarkedState }
            : p
        );
      });

      // Get current prompt state for API call from ref
      const currentPrompts = promptsRef.current;
      const prompt = currentPrompts.find(p => p.id === promptId);
      if (!prompt) return;

      if (prompt.isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', promptId);
        
        if (error) {
          // Revert optimistic update on error
          setPrompts(prev => prev.map(p => 
            p.id === promptId 
              ? { ...p, isBookmarked: prompt.isBookmarked }
              : p
          ));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, post_id: promptId });
        
        if (error && error.code === '23505') {
          // Bookmark already exists - this is fine, the optimistic update was correct
          // No need to revert the UI state
          console.log('Bookmark already exists, ignoring duplicate error');
        } else if (error) {
          // For any other error, revert the optimistic update
          console.error('Error creating bookmark:', error);
          // Revert optimistic update on error
          setPrompts(prev => prev.map(p => 
            p.id === promptId 
              ? { ...p, isBookmarked: prompt.isBookmarked }
              : p
          ));
          throw error;
        }
      }
      
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  }, [user?.id]);

  const handleShare = useCallback((promptId: string) => {
    console.log('Share prompt:', promptId);
  }, []);

  const onRefresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

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
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginLeft: 12,
    },
    notificationButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.error,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 120,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 100,
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
      paddingTop: 250,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
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

  // Set up real-time subscriptions
  useEffect(() => {
    // Initial fetch
    fetchPosts();

    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel(`posts_${user?.id || 'anonymous'}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('New post detected:', payload);
          // Add delay to ensure database consistency
          setTimeout(() => {
            fetchPosts();
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('Post updated:', payload);
          
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
              console.log('Skipping posts update - only counts changed, handled by other channels');
              return;
            }
          }
          
          // Only refetch if the post content was actually updated (not just count changes)
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
            console.log('Post content changed, refreshing...');
            setTimeout(() => {
              fetchPosts();
            }, 100);
          } else {
            console.log('Skipping posts update - no meaningful content changes detected');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('Post deleted:', payload);
          // Remove the deleted post from the list
          setPrompts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel(`likes_${user?.id || 'anonymous'}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        (payload) => {
          console.log('Likes change detected:', payload);
          
          // Skip real-time updates for the current user's actions since we handle them optimistically
          if ((payload.new && 'user_id' in payload.new && payload.new.user_id === user?.id) || 
              (payload.old && 'user_id' in payload.old && payload.old.user_id === user?.id)) {
            console.log('Skipping real-time update for current user action');
            return;
          }
          
          // Update likes count in real-time without full refresh
          if (payload.eventType === 'INSERT' && payload.new && 'post_id' in payload.new) {
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === payload.new.post_id) {
                return {
                  ...prompt,
                  likes: prompt.likes + 1,
                  isLiked: payload.new.user_id === user?.id ? true : prompt.isLiked
                };
              }
              return prompt;
            }));
          } else if (payload.eventType === 'DELETE' && payload.old && 'post_id' in payload.old) {
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === payload.old.post_id) {
                return {
                  ...prompt,
                  likes: Math.max(prompt.likes - 1, 0),
                  isLiked: payload.old.user_id === user?.id ? false : prompt.isLiked
                };
              }
              return prompt;
            }));
          }
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`comments_${user?.id || 'anonymous'}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          console.log('Comments change detected:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.post_id) {
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === payload.new.post_id) {
                return {
                  ...prompt,
                  comments: prompt.comments + 1
                };
              }
              return prompt;
            }));
          } else if (payload.eventType === 'DELETE' && payload.old.post_id) {
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === payload.old.post_id) {
                return {
                  ...prompt,
                  comments: Math.max(prompt.comments - 1, 0)
                };
              }
              return prompt;
            }));
          }
        }
      )
      .subscribe();

    const bookmarksChannel = supabase
      .channel(`bookmarks_${user?.id || 'anonymous'}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks'
        },
        (payload) => {
          console.log('Bookmarks change detected:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.post_id) {
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === payload.new.post_id && payload.new.user_id === user?.id) {
                return {
                  ...prompt,
                  isBookmarked: true
                };
              }
              return prompt;
            }));
          } else if (payload.eventType === 'DELETE' && payload.old.post_id) {
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === payload.old.post_id && payload.old.user_id === user?.id) {
                return {
                  ...prompt,
                  isBookmarked: false
                };
              }
              return prompt;
            }));
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(bookmarksChannel);
    };
  }, [user?.id, fetchPosts]);

  if (loading) {
    return <AnimatedLoader />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('navigation.home')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchPosts()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!loading && prompts.length === 0) {
    console.log('[HomeScreen] Empty state rendered. user:', user, 'Platform:', Platform.OS);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('home.title')}</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Bell size={20} color={colors.textSecondary} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={prompts}
        renderItem={({ item }) => (
          <PromptCard 
            prompt={item} 
            onLike={handleLike}
            onBookmark={handleBookmark}
            onShare={handleShare}
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
              marginBottom: 32,
            }}>
            </View>
            <Text style={{
              fontSize: 22,
              fontFamily: 'Inter-Bold',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 12,
            }}>
              {t('home.noPromptsHeadline', 'No Prompts Yet')}
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 8,
            }}>
              {t('home.noPromptsSubtext', 'Start by creating or searching for your first prompt!')}
            </Text>
          </View>
        }
        // Performance optimizations
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
    </View>
  );
}