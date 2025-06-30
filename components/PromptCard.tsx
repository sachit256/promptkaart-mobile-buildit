import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Heart,
  MessageCircle,
  Share,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  CreditCard as Edit,
  ChartBar as BarChart3,
  Brain,
  X,
  Copy,
  Check,
  Video,
  Download,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Prompt } from '@/types/prompt';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface PromptCardProps {
  prompt: Prompt;
  onLike?: (id: string) => void;
  onShare?: (id: string) => void;
  onBookmark?: (id: string) => void;
}

// Helper functions moved outside component to prevent recreation on every render
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

const getAISourceColor = (aiSource: string, primaryColor: string) => {
  switch (aiSource) {
    case 'chatgpt':
      return '#10A37F';
    case 'gemini':
      return '#4285F4';
    case 'grok':
      return '#1DA1F2';
    case 'midjourney':
      return '#7C3AED';
    default:
      return primaryColor;
  }
};

export const PromptCard = React.memo(function PromptCard({
  prompt,
  onLike,
  onShare,
  onBookmark,
}: PromptCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Memoized values to prevent recalculation on every render
  const aiSourceColor = useMemo(() => getAISourceColor(prompt.ai_source, colors.primary), [prompt.ai_source, colors.primary]);
  const aiSourceBgColor = useMemo(() => aiSourceColor + '20', [aiSourceColor]);
  
  const CHAR_LIMIT = 150;
  const shouldShowReadMore = prompt.prompt.length > CHAR_LIMIT;
  const displayText = useMemo(() => 
    isExpanded ? prompt.prompt : prompt.prompt.substring(0, CHAR_LIMIT),
    [isExpanded, prompt.prompt]
  );

  // Check if current user owns this prompt
  const isOwner = useMemo(() => user?.id === prompt.author.id, [user?.id, prompt.author.id]);

  // Memoized styles to prevent recreation on every render
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 20,
      marginHorizontal: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    authorInfo: {
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
    },
    authorName: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    category: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    imageScrollView: {
      marginTop: 4,
      marginBottom: 12,
    },
    imageScrollViewContent: {
      gap: 12,
      paddingHorizontal: 16,
    },
    image: {
      width: CARD_WIDTH - 80,
      height: CARD_WIDTH - 80,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
    },
    content: {
      padding: 16,
      paddingTop: 4,
    },
    promptContainer: {
      marginBottom: 16,
    },
    promptText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 22,
    },
    readMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingVertical: 2,
    },
    readMoreText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginRight: 4,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    tag: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    tagText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 8,
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    leftActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 15,
      backgroundColor: 'transparent',
      minWidth: 44,
      justifyContent: 'flex-start',
    },
    actionButtonBookmark: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: 'transparent',
      minWidth: 44,
      justifyContent: 'center',
    },
    actionButtonActive: {
      backgroundColor: colors.surfaceVariant,
    },
    actionText: {
      fontSize: 11,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginLeft: 3,
    },
    likedText: {
      color: colors.error,
    },
    likedButton: {
      // backgroundColor: colors.surfaceVariant,
    },
    bookmarkedText: {
      color: colors.primary,
    },
    bookmarkedButton: {
      backgroundColor: colors.surfaceVariant,
    },
    authorSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: 40,
      height: 40,
      marginRight: 12,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surfaceVariant,
    },
    aiSourceBadge: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    aiSourceText: {
      fontSize: 10,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 4,
    },
    // Modal styles
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
    // Custom Download Feedback
    feedbackContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    errorContainer: {
      borderColor: colors.error + '40',
      backgroundColor: colors.error + '10',
    },
    successContainer: {
      borderColor: colors.success + '40',
      backgroundColor: colors.success + '10',
    },
    feedbackIcon: {
      marginRight: 12,
    },
    feedbackText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      flex: 1,
    },
    errorText: {
      color: colors.error,
    },
    successText: {
      color: colors.success,
    },
  }), [colors]);

  // Reverted to original event handlers to maintain functionality
  const handleCardPress = () => {
    router.push(`/prompt/${prompt.id}`);
  };

  const handleEdit = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping edit
    router.push(`/edit-post/${prompt.id}`);
  };

  const handleViewActivity = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping activity
    router.push(`/post-activity/${prompt.id}`);
  };

  const toggleReadMore = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping read more
    setIsExpanded(!isExpanded);
  };

  const handleCopyPress = async (e: any) => {
    e.stopPropagation();
    await Clipboard.setStringAsync(prompt.prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAuthAction = (action: () => void) => {
    if (!user) {
      router.push('/auth');
    } else {
      action();
    }
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping like
    handleAuthAction(() => {
      onLike?.(prompt.id);
    });
  };

  const handleBookmarkPress = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping bookmark
    handleAuthAction(() => {
      onBookmark?.(prompt.id);
    });
  };

  const handleSharePress = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping share
    onShare?.(prompt.id);
  };

  const handleImagePress = useCallback((e: any, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
    setImageModalVisible(true);
  }, []);

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setDownloadFeedback({ type: 'error', message: 'Please allow access to save images to your gallery.' });
        setIsDownloading(false);
        setTimeout(() => setDownloadFeedback(null), 2500);
        return;
      }
      const imageString = prompt.images[currentImageIndex];
      let fileUri = '';
      if (isBase64Image(imageString)) {
        const base64Data = imageString.startsWith('data:image/')
          ? imageString.split(',')[1]
          : imageString;
        fileUri = FileSystem.cacheDirectory + `image_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      } else {
        const downloadResumable = FileSystem.createDownloadResumable(
          imageString,
          FileSystem.cacheDirectory + `image_${Date.now()}.jpg`
        );
        const downloadResult = await downloadResumable.downloadAsync();
        fileUri = downloadResult?.uri || '';
      }
      await MediaLibrary.saveToLibraryAsync(fileUri);
      setDownloadFeedback({ type: 'success', message: 'Image has been saved to your gallery.' });
    } catch (error) {
      setDownloadFeedback({ type: 'error', message: 'Failed to save image.' });
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadFeedback(null), 2500);
    }
  };

  const handleAvatarLoad = useCallback(() => {
    setIsAvatarLoading(false);
  }, []);

  // Memoized image components to prevent recreation
  const imageComponents = useMemo(() => 
    prompt.images?.map((imageUrl, index) => (
      <TouchableOpacity
        key={`${prompt.id}-image-${index}`}
        onPress={(e) => handleImagePress(e, index)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getImageSource(imageUrl) }}
          style={{
            width: CARD_WIDTH - 80,
            height: CARD_WIDTH - 80,
            borderRadius: 12,
            backgroundColor: colors.surfaceVariant,
          }}
          resizeMode="cover"
          // Add caching properties
          fadeDuration={0}
        />
      </TouchableOpacity>
    )) || [],
    [prompt.images, prompt.id, colors.surfaceVariant, handleImagePress]
  );

  // Memoized tag components
  const tagComponents = useMemo(() => 
    prompt.tags.slice(0, 3).map((tag, index) => (
      <View key={index} style={styles.tag}>
        <Text style={styles.tagText}>#{tag}</Text>
      </View>
    )),
    [prompt.tags, styles.tag, styles.tagText]
  );

  return (
    <>
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.98}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
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
                onLoad={handleAvatarLoad}
                fadeDuration={0}
                resizeMode="cover"
              />
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{prompt.author.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.category}>{prompt.category}</Text>
                <View
                  style={[
                    styles.aiSourceBadge,
                    { backgroundColor: aiSourceBgColor },
                  ]}
                >
                  <Brain size={10} color={aiSourceColor} />
                  <Text
                    style={[
                      styles.aiSourceText,
                      { color: aiSourceColor },
                    ]}
                  >
                    {prompt.ai_source.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            {isOwner && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEdit}
                >
                  <Edit size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleViewActivity}
                >
                  <BarChart3 size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Images Carousel */}
          {prompt.images && prompt.images.length > 0 && (
            <ScrollView
              key={`images-${prompt.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageScrollView}
              contentContainerStyle={styles.imageScrollViewContent}
            >
              {imageComponents}
            </ScrollView>
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Prompt Text with Inline Read More/Less */}
            <View style={styles.promptContainer}>
              <Text style={styles.promptText}>
                {displayText}
                {!isExpanded && shouldShowReadMore && '...'}
              </Text>
              {shouldShowReadMore && (
                <TouchableOpacity
                  style={styles.readMoreButton}
                  onPress={toggleReadMore}
                >
                  <Text style={styles.readMoreText}>
                    {isExpanded ? 'Show less' : 'Read more'}
                  </Text>
                  {isExpanded ? (
                    <ChevronUp size={16} color={colors.textSecondary} />
                  ) : (
                    <ChevronDown size={16} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tagsContainer}>
              {tagComponents}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <View style={styles.leftActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    prompt.isLiked && styles.likedButton,
                  ]}
                  onPress={handleLikePress}
                >
                  <Heart
                    size={16}
                    color={prompt.isLiked ? colors.error : colors.textSecondary}
                    fill={prompt.isLiked ? colors.error : 'none'}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      prompt.isLiked && styles.likedText,
                    ]}
                  >
                    {prompt.likes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <MessageCircle size={16} color={colors.textSecondary} />
                  <Text style={styles.actionText}>{prompt.comments}</Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSharePress}
                >
                  <Share size={16} color={colors.textSecondary} />
                  <Text style={styles.actionText}>{prompt.shares}</Text>
                </TouchableOpacity> */}

<TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/video-generator',
                      params: { 
                        prompt: prompt.prompt,
                        promptId: prompt.id 
                      }
                    });
                  }}
                >
                  <Video size={20} color={colors.textSecondary} />
                  {/* <Text style={[styles.actionText, { color: colors.secondary, marginLeft: 4 }]}>
                    Video
                  </Text> */}
                </TouchableOpacity>
              </View>

              <View style={styles.rightActions}>
                

                <TouchableOpacity
                  style={[
                    styles.actionButtonBookmark,
                    prompt.isBookmarked && styles.bookmarkedButton,
                  ]}
                  onPress={handleBookmarkPress}
                >
                  <Bookmark
                    size={16}
                    color={
                      prompt.isBookmarked
                        ? colors.primary
                        : colors.textSecondary
                    }
                    fill={prompt.isBookmarked ? colors.primary : 'none'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Full Screen Image Modal */}
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
            <TouchableOpacity
              style={[styles.closeButton, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={handleDownloadImage}
              disabled={isDownloading}
            >
              <Download size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalImageContainer}>
            <Image
              source={{ uri: getImageSource(prompt.images[currentImageIndex]) }}
              style={styles.modalImage}
              resizeMode="contain"
              fadeDuration={0}
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
          {/* Custom Download Feedback */}
          {downloadFeedback && (
            <View
              style={[
                styles.feedbackContainer,
                downloadFeedback.type === 'error' ? styles.errorContainer : styles.successContainer,
                { position: 'absolute', bottom: 40, left: 24, right: 24, zIndex: 100 },
              ]}
            >
              <View style={styles.feedbackIcon}>
                {downloadFeedback.type === 'error' ? (
                  <X size={20} color={colors.error} />
                ) : (
                  <Check size={20} color={colors.success} />
                )}
              </View>
              <Text
                style={[
                  styles.feedbackText,
                  downloadFeedback.type === 'error' ? styles.errorText : styles.successText,
                ]}
              >
                {downloadFeedback.message}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
});
