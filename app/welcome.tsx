import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { 
  ArrowRight, 
  Sparkles, 
  Brain, 
  Users, 
  Zap,
  ChevronRight,
} from 'lucide-react-native';
import { setHasSeenWelcome, getHasSeenWelcome } from '@/utils/onboarding';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface OnboardingPage {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  backgroundColor: string;
  gradient: string[];
}

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { completeOnboarding } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Animation values for each page
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(0)).current;
  const descriptionSlide = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const pages: OnboardingPage[] = [
    {
      id: '1',
      title: 'Welcome to PromptKaart',
      description: 'Your creative companion for generating amazing AI prompts. Discover, create, and share prompts that bring your ideas to life.',
      icon: <Sparkles size={48} color="#10A37F" />, 
      backgroundColor: '#10A37F15',
      gradient: ['#10A37F20', '#10A37F10'],
    },
    {
      id: '2',
      title: 'AI-Powered Creativity',
      description: 'Access multiple AI models including ChatGPT, Gemini, and Grok. Get the best results for your creative projects.',
      icon: <Brain size={48} color="#4285F4" />, 
      backgroundColor: '#4285F415',
      gradient: ['#4285F420', '#4285F410'],
    },
    {
      id: '3',
      title: 'Share & Discover',
      description: 'Join a community of creators. Share your prompts, discover trending ideas, and get inspired by others.',
      icon: <Users size={48} color="#1DA1F2" />, 
      backgroundColor: '#1DA1F215',
      gradient: ['#1DA1F220', '#1DA1F210'],
    },
    {
      id: '4',
      title: 'Ready to Create?',
      description: 'Start your creative journey today. Generate stunning prompts and bring your imagination to reality.',
      icon: <Zap size={48} color="#FF6B35" />, 
      backgroundColor: '#FF6B3515',
      gradient: ['#FF6B3520', '#FF6B3510'],
    },
  ];

  // Initialize animations on mount
  useEffect(() => {
    animatePageEnter();
  }, []);

  const animatePageEnter = () => {
    // Reset values
    iconScale.setValue(0.3);
    iconRotate.setValue(0);
    titleSlide.setValue(50);
    descriptionSlide.setValue(30);
    contentOpacity.setValue(0);

    // Animate in sequence
    Animated.sequence([
      // Icon animation with bounce and rotation
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Content slide in
      Animated.parallel([
        Animated.spring(titleSlide, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(descriptionSlide, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const animatePageTransition = (direction: 'next' | 'prev' = 'next') => {
    const slideDistance = direction === 'next' ? -50 : 50;
    const rotateDirection = direction === 'next' ? 1 : -1;

    // Exit animation
    Animated.parallel([
      Animated.timing(iconScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(iconRotate, {
        toValue: rotateDirection,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleSlide, {
        toValue: slideDistance,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(descriptionSlide, {
        toValue: slideDistance,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset and enter animation
      iconScale.setValue(0.3);
      iconRotate.setValue(0);
      titleSlide.setValue(-slideDistance);
      descriptionSlide.setValue(-slideDistance);
      contentOpacity.setValue(0);

      setTimeout(() => {
        animatePageEnter();
      }, 50);
    });
  };

  const handlePageChange = (page: number) => {
    const direction = page > currentPage ? 'next' : 'prev';
    setCurrentPage(page);
    animatePageTransition(direction);
    scrollViewRef.current?.scrollTo({
      x: page * width,
      animated: true,
    });
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      handlePageChange(currentPage + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      // Mark onboarding as complete in the background
      await completeOnboarding();
      // Navigate with a parameter to signal completion
      router.replace({
        pathname: '/(tabs)',
        params: { onboardingJustCompleted: 'true' },
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Fallback navigation
      router.replace('/(tabs)');
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    page: {
      width,
      height: height - insets.top - insets.bottom,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    title: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    description: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: width * 0.85,
      letterSpacing: 0.2,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingBottom: insets.bottom + 24,
      backgroundColor: colors.background,
    },
    pageIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    indicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceVariant,
      marginHorizontal: 3,
    },
    activeIndicator: {
      backgroundColor: colors.primary,
      width: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    centeredButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    skipButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    skipText: {
      fontSize: 15,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    nextButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 28,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    nextButtonText: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
      marginRight: 6,
      letterSpacing: 0.2,
    },
    getStartedButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    getStartedText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
      marginRight: 8,
      letterSpacing: 0.3,
    },
  });

  const currentPageData = pages[currentPage];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / width);
          if (page !== currentPage) {
            const direction = page > currentPage ? 'next' : 'prev';
            setCurrentPage(page);
            animatePageTransition(direction);
          }
        }}
        style={styles.scrollView}
      >
        {pages.map((page, index) => (
          <View key={page.id} style={styles.page} />
        ))}
      </ScrollView>

      {/* Animated Content Overlay */}
      <View style={[styles.page, { position: 'absolute', top: insets.top }]}>
        <Animated.View
          style={[
            styles.iconContainer,
            { 
              backgroundColor: currentPageData.backgroundColor,
              transform: [
                { scale: iconScale },
                { 
                  rotate: iconRotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })
                }
              ],
            },
          ]}
        >
          {currentPageData.icon}
        </Animated.View>
        
        <Animated.View 
          style={{ 
            opacity: contentOpacity,
            transform: [{ translateY: titleSlide }],
          }}
        >
          <Text style={styles.title}>{currentPageData.title}</Text>
        </Animated.View>
        
        <Animated.View 
          style={{ 
            opacity: contentOpacity,
            transform: [{ translateY: descriptionSlide }],
          }}
        >
          <Text style={styles.description}>{currentPageData.description}</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.pageIndicator}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentPage && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        <View style={[
          styles.buttonContainer,
          currentPage === pages.length - 1 && styles.centeredButtonContainer
        ]}>
          {currentPage < pages.length - 1 ? (
            <>
              <TouchableOpacity 
                style={styles.skipButton} 
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={() => {
                    animateButton();
                    handleNext();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <ChevronRight size={18} color={colors.white} />
                </TouchableOpacity>
              </Animated.View>
            </>
          ) : (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity 
                style={styles.getStartedButton} 
                onPress={() => {
                  animateButton();
                  handleGetStarted();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
                <ArrowRight size={18} color={colors.white} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
} 