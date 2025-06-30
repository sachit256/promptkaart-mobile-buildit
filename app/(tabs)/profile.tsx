import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Platform, Alert, ActivityIndicator, Modal, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, CreditCard as Edit, Heart, MessageCircle, Share, Globe, Sun, Moon, TrendingUp, ChartBar as BarChart3, User, Bookmark, ThumbsUp, Sparkles, X } from 'lucide-react-native';
import { LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { resetHasSeenWelcome } from '@/utils/onboarding';
import { tavusAPI, DEFAULT_REPLICA_ID } from '@/lib/tavus';
import { WebView } from 'react-native-webview';
import { LanguageSelector } from '@/components/LanguageSelector';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserStats {
  posts: number;
  likes: number;
  shares: number;
  bookmarks: number;
  comments: number;
  likesGiven: number;
  commentsGiven: number;
  bookmarksGiven: number;
}

interface UserPost {
  id: string;
  prompt: string;
  category: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
}

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, isLoggedIn, signOut, profile, resetOnboarding } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    posts: 0,
    likes: 0,
    shares: 0,
    bookmarks: 0,
    comments: 0,
    likesGiven: 0,
    commentsGiven: 0,
    bookmarksGiven: 0,
  });
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInterestPrompt, setShowInterestPrompt] = useState(false);
  const [interest, setInterest] = useState<string[]>(['MidJourney']);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [personalizedVideoUrl, setPersonalizedVideoUrl] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('Profile object:', profile);
  }, [profile]);

  const handleSignIn = () => {
    router.push('/auth');
  };

  const openSignOutModal = () => {
    setShowSignOutModal(true);
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSignOutModal = () => {
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSignOutModal(false);
    });
  };

  const handleSignOut = () => {
    openSignOutModal();
  };

  const confirmSignOut = () => {
    closeSignOutModal();
    setTimeout(() => signOut(), 350); // Wait for modal to close
  };

  const handleShowWelcomeAgain = async () => {
    try {
      await resetOnboarding();
      router.push('/welcome');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      Alert.alert('Error', 'Failed to show welcome screen again. Please try again.');
    }
  };

  const fetchUserStats = async () => {
    if (!user || !isLoggedIn) return;

    try {
      setLoading(true);

      // Get user's posts
      const { data: userPostsData } = await supabase
        .from('posts')
        .select('id, prompt, category, created_at, likes_count, comments_count, shares_count')
        .eq('user_id', user.id);

      const postIds = userPostsData?.map(post => post.id) || [];
      setUserPosts(userPostsData || []);

      // Fetch user statistics in parallel
      const [
        postsResponse,
        likesGivenResponse,
        bookmarksResponse,
        commentsGivenResponse,
        likesReceivedResponse,
        bookmarksGivenResponse
      ] = await Promise.all([
        supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id),
        
        // Likes given by user
        supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id),
        
        // Bookmarks created by user
        supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id),
        
        // Comments made by user
        supabase
          .from('comments')
          .select('id')
          .eq('user_id', user.id),
        
        // Likes received on user's posts (only if user has posts)
        postIds.length > 0 ? supabase
          .from('likes')
          .select('id')
          .in('post_id', postIds) : Promise.resolve({ data: [] }),
        
        // Bookmarks received on user's posts
        postIds.length > 0 ? supabase
          .from('bookmarks')
          .select('id')
          .in('post_id', postIds) : Promise.resolve({ data: [] })
      ]);

      const totalShares = userPostsData?.reduce((sum, post) => sum + (post.shares_count || 0), 0) || 0;

      setUserStats({
        posts: postsResponse.data?.length || 0,
        likes: likesReceivedResponse.data?.length || 0, // Likes received on user's content
        shares: totalShares,
        bookmarks: bookmarksGivenResponse.data?.length || 0, // Bookmarks received on user's posts
        comments: commentsGivenResponse.data?.length || 0, // Comments made by user
        likesGiven: likesGivenResponse.data?.length || 0,
        commentsGiven: commentsGivenResponse.data?.length || 0,
        bookmarksGiven: bookmarksResponse.data?.length || 0,
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPostActivity = (postId: string) => {
    router.push(`/post-activity/${postId}`);
  };

  // Handler for personalized prompts
  const handlePersonalizedPrompts = async () => {
    // Always open the interest modal, pre-selecting last interests
    const storedInterest = await AsyncStorage.getItem('tavus_interest');
    if (storedInterest) {
      try {
        setInterest(JSON.parse(storedInterest));
      } catch {
        setInterest(['MidJourney']);
      }
    } else {
      setInterest(['MidJourney']);
    }
    setShowInterestPrompt(true);
  };

  // Handler after user selects interest
  const handleInterestSubmit = async () => {
    setLoadingPersonalized(true);
    try {
      // Get last saved interests and video_id
      const storedInterest = await AsyncStorage.getItem('tavus_interest');
      const storedVideoId = await AsyncStorage.getItem('tavus_video_id');
      let lastInterests: string[] = [];
      try {
        lastInterests = storedInterest ? JSON.parse(storedInterest) : ['MidJourney'];
      } catch {
        lastInterests = ['MidJourney'];
      }
      // If interests are unchanged and video_id exists, just play the video
      if (storedVideoId && JSON.stringify(lastInterests.sort()) === JSON.stringify([...interest].sort())) {
        setPersonalizedVideoUrl(`https://tavus.video/${storedVideoId}`);
        setShowInterestPrompt(false);
        setLoadingPersonalized(false);
        return;
      }
      // Otherwise, generate a new video
      const userName = user?.name || user?.email?.split('@')[0] || 'User';
      const interestList = interest.join(', ');
      const script = `Hi ${userName}, welcome to PromptKaart! Since you're into ${interestList}, we've highlighted top ${interestList} prompts you might love. Tap below to try one now!`;
      const response = await tavusAPI.generateVideo({
        replica_id: DEFAULT_REPLICA_ID,
        script,
      });
      console.log('DEBUG: response', response);
      if (!response || !response.video_id) {
        throw new Error('No video ID returned');
      }
      // Save new video_id and interest
      await AsyncStorage.setItem('tavus_video_id', response.video_id);
      await AsyncStorage.setItem('tavus_interest', JSON.stringify(interest));
      // Only show video when status is ready
      const videoUrl = await pollVideoReady(response.video_id);
      setPersonalizedVideoUrl(videoUrl);
    } catch (error) {
      const errMsg = (error as any)?.message || String(error);
      Alert.alert('Error', errMsg);
      setShowInterestPrompt(false);
    } finally {
      setLoadingPersonalized(false);
    }
  };

  // Handler for toggling interests
  const toggleInterest = (opt: string) => {
    setInterest((prev) =>
      prev.includes(opt) ? prev.filter((i) => i !== opt) : [...prev, opt]
    );
  };

  // Handler for canceling interest modal
  const handleCancelInterest = () => {
    setShowInterestPrompt(false);
    setInterest(['MidJourney']);
  };

  async function pollVideoReady(video_id: string, timeout = 60000, interval = 5000) {
    const start = Date.now();
    let lastStatusResponse = null;
    while (Date.now() - start < timeout) {
      const statusResponse = await tavusAPI.getVideoStatus(video_id);
      lastStatusResponse = statusResponse;
      if (statusResponse.status === 'ready') {
        // Prefer hosted_url for playback
        return statusResponse.hosted_url || statusResponse.download_url || statusResponse.video_url;
      }
      await new Promise((res) => setTimeout(res, interval));
    }
    // If timed out, but hosted_url is present, return it as fallback
    if (lastStatusResponse?.hosted_url) {
      return lastStatusResponse.hosted_url;
    }
    throw new Error('Video generation timed out');
  }

  // Handler to close video modal and return to dashboard
  const handleCloseVideo = () => {
    setPersonalizedVideoUrl(null);
    setShowInterestPrompt(false);
  };

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchUserStats();
      // Generate personalized video in background if not already present
      (async () => {
        try {
          const storedVideoId = await AsyncStorage.getItem('tavus_video_id');
          const storedInterest = await AsyncStorage.getItem('tavus_interest');
          if (!storedVideoId) {
            // Use last selected or default interest
            const userInterest = storedInterest ? JSON.parse(storedInterest) : ['MidJourney'];
            const userName = user?.name || user?.email?.split('@')[0] || 'User';
            const interestList = userInterest.join(', ');
            const script = `Hi ${userName}, welcome to PromptKaart! Since you're into ${interestList}, we've highlighted top ${interestList} prompts you might love. Tap below to try one now!`;
            const response = await tavusAPI.generateVideo({
              replica_id: DEFAULT_REPLICA_ID,
              script,
            });
            if (response && response.video_id) {
              await AsyncStorage.setItem('tavus_video_id', response.video_id);
              await AsyncStorage.setItem('tavus_interest', JSON.stringify(userInterest));
            }
          }
        } catch (e) {
          console.log('Background Tavus video generation error:', e);
        }
      })();
    }
  }, [isLoggedIn, user]);

  const styles = StyleSheet.create({
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
    settingsButton: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
      padding: 8,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: insets.bottom + 140, // Generous padding for floating tab bar
    },
    profileSection: {
      backgroundColor: colors.surface,
      margin: 16,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    guestAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    guestAvatarText: {
      fontSize: 32,
      fontFamily: 'Inter-Bold',
      color: colors.textSecondary,
    },
    guestName: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 8,
    },
    guestDescription: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 22,
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      paddingHorizontal: 32,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    signInButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
      marginLeft: 8,
    },
    userAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 16,
    },
    userName: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 20,
    },
    signOutButton: {
      backgroundColor: colors.error + '20',
      borderRadius: 24,
      paddingHorizontal: 32,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.error + '40',
    },
    signOutButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.error,
      marginLeft: 8,
    },
    statsSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    statsTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    additionalStatsSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    additionalStatsTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 16,
    },
    additionalStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    additionalStatItem: {
      width: '48%',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    additionalStatIcon: {
      marginBottom: 8,
    },
    additionalStatValue: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 4,
    },
    additionalStatLabel: {
      fontSize: 11,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    settingsSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    settingIcon: {
      marginRight: 16,
    },
    settingText: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    settingValue: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    postsSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    postsSectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      padding: 20,
      paddingBottom: 8,
    },
    postItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    postContent: {
      flex: 1,
      marginRight: 12,
    },
    postPrompt: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 18,
      marginBottom: 4,
    },
    postCategory: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
    },
    postStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    postStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    postStatText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    viewAllButton: {
      padding: 16,
      alignItems: 'center',
    },
    viewAllText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.primary,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginLeft: 8,
    },
    blockingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    blockingContent: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      marginHorizontal: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
    },
    blockingIcon: {
      marginBottom: 16,
    },
    blockingTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: 8,
      textAlign: 'center',
    },
    blockingMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    blockingSpinner: {
      marginTop: 16,
    },
  });

  const mainStats = [
    { 
      label: 'Posts', 
      value: userStats.posts.toString(), 
      icon: MessageCircle,
      color: colors.primary 
    },
    { 
      label: 'Likes', 
      value: userStats.likes.toString(), 
      icon: Heart,
      color: colors.error 
    },
    { 
      label: 'Shares', 
      value: userStats.shares.toString(), 
      icon: Share,
      color: colors.success 
    },
  ];

  const additionalStats = [
    { 
      label: 'Bookmarks Given', 
      value: userStats.bookmarksGiven, 
      icon: Bookmark,
      color: colors.primary 
    },
    { 
      label: 'Comments Made', 
      value: userStats.commentsGiven, 
      icon: MessageCircle,
      color: colors.secondary 
    },
    { 
      label: 'Likes Given', 
      value: userStats.likesGiven, 
      icon: ThumbsUp,
      color: colors.error 
    },
    { 
      label: 'Total Engagement', 
      value: userStats.likes + userStats.bookmarks + userStats.shares, 
      icon: TrendingUp,
      color: colors.success 
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        {isLoggedIn ? (
          <View style={styles.profileSection}>
            <Image 
              source={{ 
                uri: profile?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg' 
              }} 
              style={styles.userAvatar} 
            />
            <Text style={styles.userName}>
              {profile?.display_name
                ? profile?.username
                  ? `${profile.display_name} (${profile.username})`
                  : profile.display_name
                : profile?.username || user?.name || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <LogOut size={20} color={colors.error} />
              <Text style={styles.signOutButtonText}>{t('common.signOut')}</Text>
            </TouchableOpacity>
            {/* Personalized Prompts Section */}
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'center',
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: colors.surface,
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
              onPress={handlePersonalizedPrompts}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color={colors.primary} />
              <Text style={{
                color: colors.primary,
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                marginLeft: 6,
                letterSpacing: 0.2,
              }}>Personalized Prompts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileSection}>
            <View style={styles.guestAvatar}>
              <User size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.guestName}>{t('profile.welcome')}</Text>
            <Text style={styles.guestDescription}>{t('profile.signInToCreate')}</Text>
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Edit size={18} color={colors.white} />
              <Text style={styles.signInButtonText}>{t('common.signIn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Section */}
        {isLoggedIn && (
          <>
            <View style={styles.statsSection}>
              <Text style={styles.statsTitle}>{t('profile.yourActivity')}</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>{t('profile.loadingStats')}</Text>
                </View>
              ) : (
                <View style={styles.statsGrid}>
                  {mainStats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <View key={index} style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                          <IconComponent size={20} color={stat.color} />
                        </View>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Additional Stats Section */}
            <View style={styles.additionalStatsSection}>
              <Text style={styles.additionalStatsTitle}>{t('profile.detailedActivity')}</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>{t('profile.loadingDetails')}</Text>
                </View>
              ) : (
                <View style={styles.additionalStatsGrid}>
                  {additionalStats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <View key={index} style={styles.additionalStatItem}>
                        <View style={styles.additionalStatIcon}>
                          <IconComponent size={18} color={stat.color} />
                        </View>
                        <Text style={styles.additionalStatValue}>{stat.value}</Text>
                        <Text style={styles.additionalStatLabel}>{stat.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* User Posts Section */}
            {userPosts.length > 0 && (
              <View style={styles.postsSection}>
                <Text style={styles.postsSectionTitle}>{t('profile.recentPosts')}</Text>
                {userPosts.slice(0, 3).map((post) => (
                  <TouchableOpacity 
                    key={post.id} 
                    style={styles.postItem}
                    onPress={() => handleViewPostActivity(post.id)}
                  >
                    <View style={styles.postContent}>
                      <Text style={styles.postPrompt} numberOfLines={2}>
                        {post.prompt}
                      </Text>
                      <Text style={styles.postCategory}>{post.category}</Text>
                    </View>
                    <View style={styles.postStats}>
                      <View style={styles.postStatItem}>
                        <Heart size={12} color={colors.error} />
                        <Text style={styles.postStatText}>{post.likes_count}</Text>
                      </View>
                      <View style={styles.postStatItem}>
                        <MessageCircle size={12} color={colors.primary} />
                        <Text style={styles.postStatText}>{post.comments_count}</Text>
                      </View>
                      <BarChart3 size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}
                {userPosts.length > 3 && (
                  <TouchableOpacity style={styles.viewAllButton}>
                    <Text style={styles.viewAllText}>{t('profile.viewAllPosts')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleShowWelcomeAgain}
          >
            <View style={styles.settingIcon}>
              <Sparkles size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.settingText}>{t('profile.showWelcomeAgain')}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: colors.textSecondary }}>
              {t('profile.onboarding')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowLanguageSelector(true)}
          >
            <View style={styles.settingIcon}>
              <Globe size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.settingText}>{t('profile.language')}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: colors.textSecondary }}>
              {currentLanguage.nativeName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={toggleTheme}
          >
            <View style={styles.settingIcon}>
              {theme === 'dark' ? (
                <Sun size={20} color={colors.textSecondary} />
              ) : (
                <Moon size={20} color={colors.textSecondary} />
              )}
            </View>
            <Text style={styles.settingText}>{t('profile.appearance')}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: colors.textSecondary }}>
              {theme === 'dark' ? t('profile.dark') : t('profile.light')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Interest Modal */}
      <Modal visible={showInterestPrompt && !personalizedVideoUrl} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: colors.background + 'EE', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 32, width: '80%', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>What are you most interested in?</Text>
            {['MidJourney', 'ChatGPT', 'Gemini', 'Grok'].map(opt => {
              const selected = interest.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={{
                    padding: 12,
                    marginVertical: 4,
                    backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                    borderRadius: 12,
                    width: '100%',
                    alignItems: 'center',
                    borderWidth: selected ? 2 : 0,
                    borderColor: selected ? colors.primary : 'transparent',
                  }}
                  onPress={() => toggleInterest(opt)}
                  disabled={loadingPersonalized}
                >
                  <Text style={{ color: selected ? colors.white : colors.text }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  flex: 1,
                  marginRight: 8,
                  alignItems: 'center',
                  opacity: loadingPersonalized ? 0.7 : 1,
                }}
                onPress={handleCancelInterest}
                disabled={loadingPersonalized}
              >
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  flex: 1,
                  marginLeft: 8,
                  alignItems: 'center',
                  opacity: loadingPersonalized || interest.length === 0 ? 0.7 : 1,
                }}
                onPress={handleInterestSubmit}
                disabled={loadingPersonalized || interest.length === 0}
              >
                <Text style={{ color: colors.white, fontWeight: 'bold' }}>{loadingPersonalized ? 'Generating...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
            {loadingPersonalized && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
          </View>
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal visible={!!personalizedVideoUrl} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: colors.background + 'EE', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, width: '90%', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 16 }}> {`Welcome ${profile?.display_name}`} </Text>
            <View style={{ width: '100%', aspectRatio: 16/9, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: 24 }}>
              {/* Use WebView for video playback */}
              <ModalVideoPlayer videoUrl={personalizedVideoUrl} />
            </View>
            <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 }} onPress={handleCloseVideo}>
              <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />

      {showSignOutModal && (
        <Animated.View
          style={[
            styles.blockingOverlay,
            { opacity: modalAnim },
          ]}
          pointerEvents="auto"
        >
          <Animated.View
            style={[
              styles.blockingContent,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.blockingIcon}>
              <LogOut size={30} color={colors.error} />
            </View>
            <Text style={styles.blockingTitle}>Sign Out</Text>
            <Text style={styles.blockingMessage}>
              Are you sure you want to sign out?
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 12,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginRight: 8,
                }}
                onPress={closeSignOutModal}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.error,
                  borderRadius: 12,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }}
                onPress={confirmSignOut}
              >
                <Text style={{ color: colors.white, fontWeight: '600', fontSize: 16 }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// Helper component for video playback
function ModalVideoPlayer({ videoUrl }: { videoUrl: string | null }) {
  if (!videoUrl) return null;
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface }}>
      <View style={{ flex: 1, borderRadius: 16 }}>
        <WebView
          source={{ uri: videoUrl }}
          style={{ flex: 1, borderRadius: 16 }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </View>
  );
}