import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Image, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { tavusAPI } from '@/lib/tavus';
import { ArrowLeft, Send, Loader, Play, AlertCircle, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';

const { width } = Dimensions.get('window');

export default function ConversationScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]); // { sender: 'user' | 'ai', text: string, video_url?: string }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { t } = useLanguage();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    const userMessage = { sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    try {
      let convId = conversationId;
      let aiResponse;
      if (!convId) {
        // Start new conversation
        const res = await tavusAPI.createConversation({
          replica_id: 'r6ae5b6efc9d', // Or let user pick
        });
        convId = res.conversation_id || res.id;
        setConversationId(convId);
        if (!convId) throw new Error('No conversation_id returned');
        // Now send the first message
        const msgRes = await tavusAPI.sendConversationMessage(convId, userMessage.text);
        aiResponse = msgRes;
      } else {
        // Continue conversation
        if (!convId) throw new Error('No conversation_id available');
        const res = await tavusAPI.sendConversationMessage(convId, userMessage.text);
        aiResponse = res;
      }
      // Poll for AI video response
      pollForAIResponse(convId, aiResponse.message_id || aiResponse.id);
    } catch (err) {
      setError('Failed to send message.');
      setLoading(false);
      console.error('Conversation send error:', err);
    }
  };

  // Poll for AI video response
  const pollForAIResponse = async (convId: string, messageId: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    const poll = async () => {
      try {
        const res = await tavusAPI.getConversation(convId);
        // Find the message by messageId
        const aiMsg = res.messages?.find((m: any) => m.id === messageId);
        if (aiMsg && aiMsg.status === 'completed' && aiMsg.video_url) {
          setMessages(prev => [...prev, { sender: 'ai', text: aiMsg.text, video_url: aiMsg.video_url, thumbnail_url: aiMsg.thumbnail_url }]);
          setLoading(false);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('AI response timed out.');
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to get AI response.');
        setLoading(false);
      }
    };
    poll();
  };

  const renderMessage = ({ item }: { item: any }) => (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }}>
      <View style={[
        styles.messageCard,
        {
          alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
          backgroundColor: item.sender === 'user' ? colors.primary : colors.surface,
          borderColor: item.sender === 'user' ? colors.primary : colors.border,
          shadowColor: '#000',
        },
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <View style={[styles.avatarCircle, { backgroundColor: item.sender === 'user' ? colors.primary : colors.surfaceVariant }] }>
            {item.sender === 'user' ? (
              <User size={18} color={colors.white} />
            ) : (
              <BotAvatar color={colors.primary} />
            )}
          </View>
          <Text style={{ color: item.sender === 'user' ? colors.white : colors.text, fontSize: 15, marginLeft: 8, flex: 1 }}>
            {item.text}
          </Text>
        </View>
        {item.video_url && (
          <TouchableOpacity
            onPress={() => item.video_url && (Platform.OS === 'web' ? window.open(item.video_url, '_blank') : null /* router.push({ pathname: '/video-player', params: { url: item.video_url } }) */)}
            style={styles.videoThumbContainer}
            activeOpacity={0.85}
          >
            <View style={styles.videoThumbOverlay}>
              <Play size={32} color={colors.white} />
            </View>
            <Image
              source={{ uri: item.thumbnail_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg' }}
              style={styles.videoThumb}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingTop: Platform.OS === 'android' ? insets.top + 12 : insets.top + 16 }] }>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surfaceVariant }] }>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text } ]}>{t('conversation.title', 'AI Video Conversation')}</Text>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      {/* Error Feedback */}
      {error && (
        <View style={[styles.feedbackContainer, styles.errorContainer, { backgroundColor: colors.error + '10', borderColor: colors.error + '40' }] }>
          <AlertCircle size={20} color={colors.error} style={styles.feedbackIcon} />
          <Text style={[styles.feedbackText, styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Loader Overlay */}
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={[styles.inputBarContainer]}
      >
        <View style={[styles.inputBar, { backgroundColor: colors.surface, shadowColor: '#000', paddingBottom: insets.bottom }] }>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: 'transparent' }]}
            value={input}
            onChangeText={setInput}
            placeholder={t('conversation.placeholder', 'Type your message...')}
            placeholderTextColor={colors.textSecondary}
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: input.trim() && !loading ? colors.primary : colors.surfaceVariant }]}
            onPress={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <Loader size={20} color={colors.white} />
            ) : (
              <Send size={20} color={input.trim() ? colors.white : colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function BotAvatar({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Loader size={16} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  messageCard: {
    borderRadius: 18,
    padding: 16,
    marginVertical: 8,
    maxWidth: width * 0.8,
    minWidth: 80,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    width: 180,
    height: 100,
    alignSelf: 'center',
    position: 'relative',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  videoThumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  inputBarContainer: {
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  sendButton: {
    marginLeft: 8,
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  feedbackIcon: {
    marginRight: 8,
  },
  feedbackText: {
    fontSize: 14,
    flex: 1,
  },
  errorContainer: {},
  errorText: {},
}); 