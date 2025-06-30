import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Sparkles, Brain, Zap } from 'lucide-react-native';
import { UserCheck } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAvatar } from '@/contexts/AvatarContext';
import { AnimatedLoader } from '@/components/AnimatedLoader';
import { tavusAPI, DEFAULT_REPLICA_ID } from '@/lib/tavus';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { selectedAvatar, setSelectedAvatar } = useAvatar();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleAuth = async () => {
    if (loading) return;
    setErrors({});
    
    const newErrors: { [key: string]: string } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required.';
    }

    if (isSignUp) {
      if (!name.trim()) {
        newErrors.name = 'Full name is required.';
      } else if (name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters.';
      }

      if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters.';
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      let result;

      if (isSignUp) {
        const username = '@' + name.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 19);
        result = await signUp(email.trim(), password, name.trim(), username, selectedAvatar || undefined);
      } else {
        result = await signIn(email.trim(), password);
      }

      if (result.error) {
        setErrors({ general: result.error });
        Alert.alert('Error', result.error);
        return;
      }

      // For login, go to dashboard directly
      // router.replace('/(tabs)');
    } catch (error) {
      const errMsg = (error as any)?.message || String(error);
      setErrors({ general: errMsg });
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    // Navigate to home screen (tabs)
    router.replace('/(tabs)');
  };

  const handleAvatarGallery = () => {
    router.push({
      pathname: '/avatar-gallery',
      params: { 
        currentAvatar: selectedAvatar || '',
        returnTo: 'auth',
        isSignUp: isSignUp ? 'true' : 'false',
      }
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' ? insets.top + 12 : insets.top + 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backButton: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
    },
    headerTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginLeft: 12,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 32,
      paddingBottom: Platform.OS === 'android' ? 32 + insets.bottom : 32,
      alignItems: 'center',
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    aiIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      position: 'relative',
    },
    aiIconGlow: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '10',
    },
    sparkleIcon1: {
      position: 'absolute',
      top: -3,
      right: -3,
    },
    sparkleIcon2: {
      position: 'absolute',
      bottom: -3,
      left: -3,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 16,
    },
    avatarSection: {
      marginBottom: 20,
    },
    avatarLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.text,
      marginBottom: 8,
    },
    avatarLinkContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 16,
      alignItems: 'center',
    },
    avatarPreview: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarPreviewImage: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarPlaceholder: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.textSecondary,
    },
    avatarLinkButton: {
      backgroundColor: colors.primary + '20',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    avatarLinkText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.primary,
    },
    avatarSelectedText: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginTop: 4,
    },
    formCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 32,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 8,
    },
    form: {
      gap: 20,
      marginBottom: 0,
    },
    inputContainer: {
      position: 'relative',
      marginBottom: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontFamily: 'Inter-Medium',
      color: colors.text,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 16,
      height: 52,
    },
    inputWrapperFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      height: '100%',
      backgroundColor: 'transparent',
    },
    eyeButton: {
      padding: 6,
      borderRadius: 8,
    },
    authButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
      opacity: loading ? 0.7 : 1,
    },
    authButtonText: {
      fontSize: 17,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginHorizontal: 16,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    switchText: {
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    switchButton: {
      marginLeft: 8,
    },
    switchButtonText: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: colors.primary,
    },
    guestContainer: {
      alignItems: 'center',
    },
    guestButton: {
      backgroundColor: 'transparent',
      borderRadius: 14,
      height: 48,
      paddingHorizontal: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.primary,
      flexDirection: 'row',
      marginTop: 8,
    },
    guestButtonText: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: colors.primary,
      marginLeft: 8,
    },
    guestIcon: {
      opacity: 0.7,
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.error,
      marginTop: 4,
      marginLeft: 4,
    },
  });

  if (loading) {
    return <AnimatedLoader />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.aiIconContainer}>
              <View style={styles.aiIconGlow} />
              <Brain size={32} color={colors.primary} />
              <Sparkles size={12} color={colors.accent} style={styles.sparkleIcon1} />
              <Zap size={10} color={colors.secondary} style={styles.sparkleIcon2} />
            </View>
            <Text style={styles.title}>
              {isSignUp ? 'Join PromptKaart AI' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Unlock AI-driven creativity and join thousands of creators'
                : 'Continue your AI-powered creative journey'
              }
            </Text>
          </View>

          {/* Avatar Selection (Sign Up only) */}
          {isSignUp && (
            <View style={styles.avatarSection}>
              <View style={styles.avatarLinkContainer}>
                {selectedAvatar ? (
                  <View style={styles.avatarPreview}>
                    <Image 
                      source={{ uri: selectedAvatar }} 
                      style={styles.avatarPreviewImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={styles.avatarPreview}>
                    <Text style={styles.avatarPlaceholder}>?</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.avatarLinkButton}
                  onPress={handleAvatarGallery}
                  disabled={loading}
                >
                  <Text style={styles.avatarLinkText}>
                    {selectedAvatar ? 'Change Avatar' : 'Choose Avatar'}
                  </Text>
                </TouchableOpacity>
                {selectedAvatar && (
                  <Text style={styles.avatarSelectedText}>Avatar selected</Text>
                )}
              </View>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.form}>
              {/* Name Input (Sign Up only) */}
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={[styles.inputWrapper, name && styles.inputWrapperFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputWrapper, email && styles.inputWrapperFocused]}>
                  <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, password && styles.inputWrapperFocused]}>
                  <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password Input (Sign Up only) */}
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={[styles.inputWrapper, confirmPassword && styles.inputWrapperFocused]}>
                    <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>
              )}

              {errors.general && (
                <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 10, fontSize: 13 }]}>
                  {errors.general}
                </Text>
              )}

              {/* Auth Button */}
              <TouchableOpacity 
                style={styles.authButton} 
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.authButtonText}>
                  {loading 
                    ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                    : (isSignUp ? 'Create Account' : 'Sign In')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Switch Auth Mode */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                // Reset form when switching modes
                setSelectedAvatar(null);
                setName('');
                setConfirmPassword('');
                setErrors({});
              }}
              disabled={loading}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Guest Option */}
          <View style={styles.guestContainer}>
            <TouchableOpacity 
              style={styles.guestButton} 
              onPress={handleContinueAsGuest}
              disabled={loading}
            >
              <UserCheck size={18} color={colors.textSecondary} style={styles.guestIcon} />
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}