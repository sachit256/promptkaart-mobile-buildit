import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share,
  ChevronLeft,
  ChevronRight,
  Send,
  Bookmark,
  CircleAlert as AlertCircle,
  X,
  Copy,
  Check,
  Video,
} from 'lucide-react-native';
import { CommentCard } from '@/components/CommentCard';
import { useComments } from '@/hooks/useComments';
import { supabase } from '@/lib/supabase';
import { Prompt } from '@/types/prompt';
import { AnimatedLoader } from '@/components/AnimatedLoader';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;

type PostDetails = Omit<
  Prompt,
  'author' | 'createdAt' | 'isLiked' | 'isBookmarked'
> & {
  created_at: string;
  is_liked: boolean;
  is_bookmarked: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
};

export default function PromptDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { user, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [showReplies, setShowReplies] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [isCopied, setIsCopied] = useState(false);

  const {
    comments,
    loading: commentsLoading,
    addComment,
    toggleCommentLike,
  } = useComments(id as string);

  // Helper function to determine if image is base64 or URL
  const isBase64Image = (imageString: string) => {
    if (!imageString) return false;
    // Check for data URI format first
    if (imageString.startsWith('data:image/')) {
      return true;
    }

    // Check if it's a URL (contains protocol or starts with http/https)
    if (
      imageString.startsWith('http://') ||
      imageString.startsWith('https://') ||
      imageString.includes('://')
    ) {
      return false;
    }

    // For pure base64 strings (without data URI prefix), check more strictly
    // Base64 strings should be much longer and contain only valid base64 characters
    if (imageString.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(imageString)) {
      return true;
    }

    return false;
  };

  // Helper function to get proper image source
  const getImageSource = (imageString: string) => {
    if (isBase64Image(imageString)) {
      // If it's base64, use it directly
      return imageString.startsWith('data:image/')
        ? imageString
        : `data:image/jpeg;base64,${imageString}`;
    } else {
      // If it's a URL, use it as is
      return imageString;
    }
  };

  const handleCopyPress = async () => {
    if (!prompt) return;
    await Clipboard.setStringAsync(prompt.prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const fetchPrompt = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_post_details', {
          p_post_id: id,
          p_user_id: user?.id || null,
        })
        .single();

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error('Post not found');
      }

      const typedData = data as PostDetails;

      const transformedPrompt: Prompt = {
        id: typedData.id,
        prompt: typedData.prompt,
        ai_source: ['chatgpt', 'grok', 'gemini', 'midjourney'].includes(
          typedData.ai_source
        )
          ? (typedData.ai_source as Prompt['ai_source'])
          : 'chatgpt',
        images: typedData.images,
        category: typedData.category,
        tags: typedData.tags,
        likes: typedData.likes,
        comments: typedData.comments,
        shares: typedData.shares,
        createdAt: typedData.created_at,
        isLiked: typedData.is_liked,
        isBookmarked: typedData.is_bookmarked,
        author: {
          id: typedData.author?.id || 'unknown-author',
          name: typedData.author?.display_name || typedData.author?.username || typedData.author?.name || 'Deleted User',
          avatar:
            typedData.author?.avatar ||
            'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
        },
      };

      setPrompt(transformedPrompt);
    } catch (err) {
      console.error('Error fetching prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prompt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPrompt();
    }
  }, [id, user?.id]);

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    setImageModalVisible(true);
  };

  const handleLike = async () => {
    if (!user || !prompt) return;
    try {
      // Store original state for potential rollback
      const originalLikedState = prompt.isLiked;
      const originalLikesCount = prompt.likes;
      const newLikedState = !prompt.isLiked;
      const newLikesCount = newLikedState ? prompt.likes + 1 : prompt.likes - 1;

      // Optimistic update
      setPrompt((p) =>
        p ? { ...p, isLiked: newLikedState, likes: newLikesCount } : null
      );

      if (newLikedState) {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: prompt.id });
        if (error) {
          // Revert optimistic update on error
          setPrompt((p) =>
            p
              ? { ...p, isLiked: originalLikedState, likes: originalLikesCount }
              : null
          );
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', prompt.id);
        if (error) {
          // Revert optimistic update on error
          setPrompt((p) =>
            p
              ? { ...p, isLiked: originalLikedState, likes: originalLikesCount }
              : null
          );
          throw error;
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleBookmark = async () => {
    if (!user || !prompt) return;
    try {
      // Store original state for potential rollback
      const originalBookmarkedState = prompt.isBookmarked;
      const newBookmarkedState = !prompt.isBookmarked;

      // Optimistic update
      setPrompt((p) => (p ? { ...p, isBookmarked: newBookmarkedState } : null));

      if (newBookmarkedState) {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, post_id: prompt.id });
        if (error && error.code === '23505') {
          // Bookmark already exists - this is fine, the optimistic update was correct
          // No need to revert the UI state
          console.log('Bookmark already exists, ignoring duplicate error');
        } else if (error) {
          // For any other error, revert the optimistic update
          console.error('Error creating bookmark:', error);
          // Revert optimistic update on error
          setPrompt((p) =>
            p ? { ...p, isBookmarked: originalBookmarkedState } : null
          );
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', prompt.id);
        if (error) {
          console.error('Error deleting bookmark:', error);
          // Revert optimistic update on error
          setPrompt((p) =>
            p ? { ...p, isBookmarked: originalBookmarkedState } : null
          );
          throw error;
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handlePostComment = async () => {
    if (!isLoggedIn) {
      Alert.alert('Sign In Required', 'Please sign in to post a comment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    if (newComment.trim() === '' || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await addComment(newComment);
      setNewComment('');

      // Update comment count optimistically
      setPrompt((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments + 1,
            }
          : null
      );
    } catch (err) {
      console.error('Error posting comment:', err);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReplyToComment = async (commentId: string, content: string) => {
    if (!isLoggedIn) {
      Alert.alert('Sign In Required', 'Please sign in to reply to comments.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    try {
      await addComment(content, commentId);

      // Update comment count optimistically
      setPrompt((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments + 1,
            }
          : null
      );
    } catch (err) {
      console.error('Error posting reply:', err);
      Alert.alert('Error', 'Failed to post reply. Please try again.');
    }
  };

  const handleCommentLike = async (commentId: string, postId: string) => {
    if (!isLoggedIn) {
      Alert.alert('Sign In Required', 'Please sign in to like comments.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    try {
      await toggleCommentLike(commentId, postId);
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const toggleReplies = (commentId: string) => {
    setShowReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;

    return 'Just now';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' ? insets.top + 12 : insets.top + 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: colors.surfaceVariant,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      textAlign: 'left',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
    scrollView: {
      flex: 1,
      paddingBottom: insets.bottom + 24,
    },
    imageScrollView: {
      paddingVertical: 16,
    },
    imageScrollViewContent: {
      gap: 12,
      paddingHorizontal: 16,
    },
    image: {
      width: width - 80,
      height: width - 80,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
    },
    content: {
      paddingHorizontal: 20,
    },
    authorSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    avatarContainer: {
      width: 50,
      height: 50,
      marginRight: 16,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.surface,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surfaceVariant,
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    category: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    timeAgo: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginTop: 2,
    },
    promptContainer: {
      position: 'relative',
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    promptText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 22,
      paddingRight: 40,
    },
    copyButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 4,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    tag: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    tagText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
    },
    actionsSection: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 20,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 8,
      gap: 12,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 20,
    },
    actionCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    likedButton: {
      backgroundColor: colors.error + '20',
    },
    bookmarkedButton: {
      backgroundColor: colors.primary + '20',
    },
    likedText: {
      color: colors.error,
    },
    bookmarkedText: {
      color: colors.primary,
    },
    commentsSection: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 24,
      marginTop: 24,
      borderRadius: 20,
      paddingBottom: 32,
    },
    commentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    commentsTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginRight: 8,
    },
    commentsCount: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    commentInputContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
      padding: 8,
    },
    commentInputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 10,
    },
    commentInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      maxHeight: 100,
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 6,
      marginLeft: 6,
      marginBottom: 8,
      opacity: isSubmittingComment ? 0.6 : 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.surfaceVariant,
    },
    loginPrompt: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
    },
    loginPromptText: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    loginButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
    },
    commentsContainer: {
      gap: 16,
    },
    noComments: {
      textAlign: 'center',
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      paddingVertical: 32,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'black',
    },
    modalHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: StatusBar.currentHeight || 44,
      paddingBottom: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    modalImageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImage: {
      width: width,
      height: width, // Square aspect ratio for modal
      resizeMode: 'contain',
    },
    modalNavigation: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalNavButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 25,
      padding: 12,
    },
    modalIndicators: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    modalIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    modalActiveIndicator: {
      backgroundColor: 'white',
    },
    closeButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 20,
      padding: 8,
    },
    navLeft: {
      left: 0,
    },
    navRight: {
      right: 0,
    },
    actionButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
      marginLeft: 4,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('prompt.details')}</Text>
        </View>
        <AnimatedLoader fullScreen={false} />
      </View>
    );
  }

  if (error || !prompt) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('prompt.details')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle
            size={64}
            color={colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error || 'Prompt not found'}</Text>
          <Text style={styles.errorDescription}>
            Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPrompt}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Group comments by parent_id for nested display
  const topLevelComments = comments.filter((comment) => !comment.parent_id);
  const getReplies = (parentId: string) =>
    comments.filter((comment) => comment.parent_id === parentId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('prompt.details')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Images Carousel */}
        {prompt.images && prompt.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollView}
            contentContainerStyle={styles.imageScrollViewContent}
          >
            {prompt.images.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleImagePress(index)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: getImageSource(imageUrl) }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Author Section */}
          <View style={styles.authorSection}>
            <View style={styles.avatarContainer}>
              {isAvatarLoading && (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}
              <Image
                source={{ uri: prompt.author.avatar }}
                style={[
                  styles.avatar,
                  isAvatarLoading && { position: 'absolute' },
                ]}
                onLoad={() => setIsAvatarLoading(false)}
              />
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{prompt.author.name}</Text>
              <Text style={styles.category}>{prompt.category}</Text>
              <Text style={styles.timeAgo}>
                {formatTimeAgo(prompt.createdAt)}
              </Text>
            </View>
          </View>

          {/* Prompt Text */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptText}>{prompt.prompt}</Text>
            <TouchableOpacity
              onPress={handleCopyPress}
              style={styles.copyButton}
            >
              {isCopied ? (
                <Check size={16} color={colors.success} />
              ) : (
                <Copy size={16} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Tags */}
          {prompt.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {prompt.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsSection}>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionItem, prompt.isLiked && styles.likedButton]}
                onPress={handleLike}
              >
                <Heart
                  size={18}
                  color={prompt.isLiked ? colors.error : colors.textSecondary}
                  fill={prompt.isLiked ? colors.error : 'none'}
                />
                <Text style={[styles.actionCount, prompt.isLiked && styles.likedText]}>
                  {prompt.likes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <MessageCircle size={18} color={colors.textSecondary} />
                <Text style={styles.actionCount}>{prompt.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionItem, prompt.isBookmarked && styles.bookmarkedButton]}
                onPress={handleBookmark}
              >
                <Bookmark
                  size={18}
                  color={prompt.isBookmarked ? colors.primary : colors.textSecondary}
                  fill={prompt.isBookmarked ? colors.primary : 'none'}
                />
              </TouchableOpacity>

              {/* <TouchableOpacity style={styles.actionItem}>
                <Share size={18} color={colors.textSecondary} />
              </TouchableOpacity> */}

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => router.push({
                  pathname: '/video-generator',
                  params: { 
                    prompt: prompt.prompt,
                    promptId: prompt.id 
                  }
                })}
              >
                <Video size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.content}>
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>{t('prompt.comments')}</Text>
              <Text style={styles.commentsCount}>({prompt.comments})</Text>
            </View>

            {/* Comment Input */}
            {isLoggedIn ? (
              <View style={styles.commentInputContainer}>
                <View style={styles.commentInputWrapper}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={t('prompt.writeComment')}
                    placeholderTextColor={colors.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    textAlignVertical={Platform.OS === 'android' ? 'center' : undefined}
                    editable={!isSubmittingComment}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (newComment.trim() === '' || isSubmittingComment) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={handlePostComment}
                    disabled={newComment.trim() === '' || isSubmittingComment}
                  >
                    <Send
                      size={14}
                      color={
                        newComment.trim() === '' || isSubmittingComment
                          ? colors.textSecondary
                          : colors.white
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>
                  {t('auth.signInToJoin')}
                </Text>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push('/auth')}
                >
                  <Text style={styles.loginButtonText}>{t('common.signIn')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Comments List */}
            <View style={styles.commentsContainer}>
              {commentsLoading ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : topLevelComments.length > 0 ? (
                topLevelComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  return (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      postId={prompt.id}
                      onLike={handleCommentLike}
                      onReply={handleReplyToComment}
                      depth={0}
                      maxDepth={2}
                      replies={replies}
                      showReplies={showReplies[comment.id]}
                      onToggleReplies={() => toggleReplies(comment.id)}
                    />
                  );
                })
              ) : (
                <Text style={styles.noComments}>
                  {t('prompt.noComments')}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImageModalVisible(false)}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalImageContainer}>
            <Image
              source={{ uri: getImageSource(prompt.images[currentImageIndex]) }}
              style={styles.modalImage}
              resizeMode="contain"
            />

            {prompt.images.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.modalNavigation, styles.navLeft]}
                  onPress={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? prompt.images.length - 1 : prev - 1
                    )
                  }
                >
                  <View style={styles.modalNavButton}>
                    <ChevronLeft size={24} color="white" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalNavigation, styles.navRight]}
                  onPress={() =>
                    setCurrentImageIndex((prev) =>
                      prev === prompt.images.length - 1 ? 0 : prev + 1
                    )
                  }
                >
                  <View style={styles.modalNavButton}>
                    <ChevronRight size={24} color="white" />
                  </View>
                </TouchableOpacity>

                <View style={styles.modalIndicators}>
                  {prompt.images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.modalIndicator,
                        index === currentImageIndex &&
                          styles.modalActiveIndicator,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
