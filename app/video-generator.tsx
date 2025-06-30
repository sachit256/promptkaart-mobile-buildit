import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Video, Play, Download, Share, Wand as Wand2, User, Settings, Clock, CircleCheck as CheckCircle, Circle as XCircle, Loader } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { tavusAPI } from '@/lib/tavus';
import { DEFAULT_REPLICA_ID } from '@/lib/tavus';
import { TavusReplica, VideoGeneration } from '@/types/tavus';
import { AnimatedLoader } from '@/components/AnimatedLoader';
import { Picker } from '@react-native-picker/picker';

// Helper to get initials from name
function getInitials(name: string) {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0];
  return parts[0][0] + parts[parts.length - 1][0];
}

// Helper to get a color for dummy avatar
function getAvatarColor(id: string) {
  const colors = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB86C', '#FF6C6C', '#6CFFB8'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return colors[hash % colors.length];
}

// Helper to get progress percent from 'generation_progress' string
function getProgressPercent(progressString?: string) {
  if (!progressString) return null;
  const [current, total] = progressString.split('/').map(Number);
  if (!current || !total) return null;
  return Math.round((current / total) * 100);
}

export default function VideoGeneratorScreen() {
  const { colors } = useTheme();
  const { user, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [replicas, setReplicas] = useState<TavusReplica[]>([]);
  const [selectedReplica, setSelectedReplica] = useState<string>('');
  const [script, setScript] = useState<string>('');
  const [customizations, setCustomizations] = useState({
    background: 'office',
    voiceStability: 0.5,
    similarityBoost: 0.75,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<VideoGeneration | null>(null);
  const [loadingReplicas, setLoadingReplicas] = useState(true);
  const [useMockAPI, setUseMockAPI] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(true);

  // Pre-fill script from prompt if coming from prompt detail
  useEffect(() => {
    if (params.prompt) {
      setScript(params.prompt as string);
    }
  }, [params.prompt]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth');
      return;
    }
    fetchReplicas();
  }, [isLoggedIn]);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const fetchReplicas = async () => {
    setLoadingReplicas(true);
    try {
      const response = await tavusAPI.getReplicas();
      if (response.data && response.data.length > 0) {
        const mappedReplicas = response.data.map((replica: any) => ({
          ...replica,
          status: replica.status === 'completed' ? 'ready' : replica.status,
          thumbnail_url: replica.thumbnail_video_url,
        }));
        setReplicas(mappedReplicas);
        setSelectedReplica(mappedReplicas[0].replica_id);
        setUseMockAPI(false);
      } else {
        throw new Error('No replicas found for your account.');
      }
    } catch (error) {
      console.warn('Could not fetch real replicas, using default replica:', error);
      // Use default replica as fallback
      const defaultReplicas = [{
        replica_id: DEFAULT_REPLICA_ID,
        replica_name: 'Anna',
        status: 'ready' as const,
        thumbnail_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
        created_at: new Date().toISOString()
      }];
      setReplicas(defaultReplicas);
      setSelectedReplica(DEFAULT_REPLICA_ID);
      setUseMockAPI(true);
    } finally {
      setLoadingReplicas(false);
    }
  };

  const generateVideo = async () => {
    if (!script.trim() || !selectedReplica) {
      Alert.alert('Missing Information', 'Please enter a script and select an AI avatar.');
      return;
    }

    try {
      setIsGenerating(true);
      setPollAttempts(0);

      // Only send supported fields
      const videoRequest = {
        replica_id: selectedReplica,
        script: script.trim(),
        // Optionally: video_name, background_url
      };

      let response;
      if (useMockAPI) {
        response = await tavusAPI.mockGenerateVideo(script.trim());
      } else {
        try {
          response = await tavusAPI.generateVideo(videoRequest);
          console.log('Video generation response:', response);
        } catch (error) {
          console.warn('API failed, using mock:', error);
          setUseMockAPI(true);
          response = await tavusAPI.mockGenerateVideo(script.trim());
        }
      }

      // Create a local video generation record
      const videoGeneration: VideoGeneration = {
        id: Date.now().toString(),
        prompt_id: params.promptId as string || '',
        user_id: user?.id || '',
        tavus_video_id: response.video_id,
        status: 'generating',
        script: script.trim(),
        replica_id: selectedReplica,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setGeneratedVideo(videoGeneration);

      // Start polling for video completion after a 10-second delay
      console.log('Polling video status for ID:', response.video_id);
      setTimeout(() => pollVideoStatus(response.video_id), 10000);

    } catch (error) {
      console.error('Error generating video:', error);
      Alert.alert('Generation Failed', 'Failed to generate video. Please try again.');
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let errorCount = 0;
    const maxErrorCount = 5; // Allow up to 5 consecutive errors

    const poll = async () => {
      if (!isActiveRef.current) return; // Stop polling if unmounted
      try {
        let response;
        if (useMockAPI) {
          response = await tavusAPI.mockGetVideoStatus(videoId, pollAttempts);
        } else {
          try {
            response = await tavusAPI.getVideo(videoId);
            console.log('Video status response:', response);
            errorCount = 0; // Reset error count on success
          } catch (error) {
            const err = error as any;
            if (
              err.message &&
              err.message.includes('Invalid video_uuid')
            ) {
              errorCount++;
              if (errorCount < maxErrorCount) {
                pollTimeoutRef.current = setTimeout(poll, 5000);
                return;
              } else {
                console.warn('Too many Invalid video_uuid errors, switching to mock or showing error.');
                setUseMockAPI(true);
                response = await tavusAPI.mockGetVideoStatus(videoId, pollAttempts);
              }
            } else {
              console.warn('API polling failed, using mock:', error);
              setUseMockAPI(true);
              response = await tavusAPI.mockGetVideoStatus(videoId, pollAttempts);
            }
          }
        }

        setGeneratedVideo(prev => prev ? {
          ...prev,
          status: response.status === 'completed' ? 'completed' : 
                 response.status === 'failed' ? 'failed' : 'generating',
          video_url: response.hosted_url,
          thumbnail_url: response.thumbnail_url,
          duration: response.duration,
          updated_at: new Date().toISOString(),
          generation_progress: response.generation_progress,
        } : null);

        if (response.status === 'completed') {
          console.log('Video generation completed! Hosted URL:', response.hosted_url);
          setIsGenerating(false);
          return;
        }

        if (response.status === 'failed') {
          setIsGenerating(false);
          Alert.alert('Generation Failed', 'Video generation failed. Please try again.');
          return;
        }

        setPollAttempts(prev => prev + 1);
        if (pollAttempts < maxAttempts) {
          pollTimeoutRef.current = setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsGenerating(false);
          Alert.alert('Timeout', 'Video generation is taking longer than expected.');
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        setIsGenerating(false);
      }
    };

    poll();
  };

  const handleShare = () => {
    if (generatedVideo?.video_url) {
      if (Platform.OS === 'web') {
        // Web sharing
        if (navigator.share) {
          navigator.share({
            title: 'Check out my AI-generated video!',
            text: 'I created this video using PromptKaart\'s AI video generator.',
            url: generatedVideo.video_url,
          }).catch(console.error);
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard?.writeText(generatedVideo.video_url);
          Alert.alert('Copied!', 'Video URL copied to clipboard.');
        }
      } else {
        Alert.alert('Share', 'Sharing functionality would be implemented here.');
      }
    }
  };

  const handleDownload = () => {
    if (generatedVideo?.video_url) {
      if (Platform.OS === 'web') {
        // Web download
        const link = document.createElement('a');
        link.href = generatedVideo.video_url;
        link.download = `video_${generatedVideo.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('Download', 'Download functionality would be implemented here.');
      }
    }
  };

  const handlePlayVideo = () => {
    if (generatedVideo?.video_url) {
      if (Platform.OS === 'web') {
        window.open(generatedVideo.video_url, '_blank');
      } else {
        // For mobile, you might want to use a video player component
        Alert.alert('Play', 'Video player would open here.');
      }
    }
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
      padding: 8,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: colors.surfaceVariant,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    videoIcon: {
      backgroundColor: colors.primary + '20',
      borderRadius: 20,
      padding: 8,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 12,
    },
    sectionDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    scriptInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      minHeight: 120,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
    },
    replicasContainer: {
      gap: 12,
    },
    replicaCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedReplicaCard: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    replicaImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surfaceVariant,
      marginRight: 16,
    },
    replicaInfo: {
      flex: 1,
    },
    replicaName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    replicaStatus: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.success,
    },
    customizationCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    customizationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    customizationLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.text,
    },
    customizationValue: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    generateButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
    },
    generateButtonDisabled: {
      backgroundColor: colors.surfaceVariant,
    },
    generateButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
      marginLeft: 8,
    },
    generateButtonTextDisabled: {
      color: colors.textSecondary,
    },
    videoResultCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginLeft: 8,
    },
    videoThumbnail: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      marginBottom: 16,
    },
    videoActions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    secondaryActionButton: {
      backgroundColor: colors.surfaceVariant,
    },
    actionButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.white,
      marginLeft: 6,
    },
    secondaryActionButtonText: {
      color: colors.text,
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
    demoNotice: {
      backgroundColor: colors.warning + '20',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    },
    demoNoticeText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.warning,
      textAlign: 'center',
    },
  });

  if (!isLoggedIn) {
    return null;
  }

  if (loadingReplicas) {
    return <AnimatedLoader fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Generator</Text>
        <View style={styles.videoIcon}>
          <Video size={20} color={colors.primary} />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Demo Notice */}
        {useMockAPI && (
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>
              Demo Mode: Using sample data. Configure EXPO_PUBLIC_TAVUS_API_KEY for full functionality.
            </Text>
          </View>
        )}

        {/* Script Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Script</Text>
          <Text style={styles.sectionDescription}>
            Enter the text you want your AI avatar to speak. This can be your prompt, a story, or any message you want to bring to life.
          </Text>
          <TextInput
            style={styles.scriptInput}
            placeholder="Enter your script here..."
            placeholderTextColor={colors.textSecondary}
            value={script}
            onChangeText={setScript}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* AI Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose AI Avatar</Text>
          <Text style={styles.sectionDescription}>
            Select an AI avatar that will present your content. Each avatar has unique characteristics and voice.
          </Text>
          {/* Redesigned dropdown button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.85}
          >
            {/* Dummy avatar always present */}
            <View style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: getAvatarColor(selectedReplica),
              alignItems: 'center', justifyContent: 'center', marginRight: 10, position: 'relative',
            }}>
              <User size={22} color={'#fff'} />
              {/* Overlay thumbnail if available */}
              {replicas.find(r => r.replica_id === selectedReplica)?.thumbnail_url && (
                <Image
                  source={{ uri: replicas.find(r => r.replica_id === selectedReplica)?.thumbnail_url }}
                  style={{
                    width: 44, height: 44, borderRadius: 22, position: 'absolute', top: 0, left: 0,
                    borderWidth: 2, borderColor: '#fff',
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.replicaName, { fontSize: 17 }]} numberOfLines={1}>{replicas.find(r => r.replica_id === selectedReplica)?.replica_name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{replicas.find(r => r.replica_id === selectedReplica)?.model_name}</Text>
            </View>
            <View style={{ marginLeft: 8 }}>
              <User size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Modal for avatar selection */}
          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: colors.background + 'CC', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, width: '92%', maxHeight: '75%' }}>
                <Text style={[styles.sectionTitle, { marginBottom: 18, fontSize: 20, textAlign: 'center' }]}>Select an AI Avatar</Text>
                <FlatList
                  data={replicas}
                  keyExtractor={item => item.replica_id}
                  renderItem={({ item }) => {
                    const isSelected = item.replica_id === selectedReplica;
                    return (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8,
                          borderRadius: 14, marginBottom: 8,
                          backgroundColor: isSelected ? colors.primary + '18' : colors.surface,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                          shadowColor: isSelected ? colors.primary : '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.12 : 0.06,
                          shadowRadius: 6,
                          elevation: isSelected ? 3 : 1,
                        }}
                        onPress={() => {
                          setSelectedReplica(item.replica_id);
                          setIsModalVisible(false);
                        }}
                        activeOpacity={0.85}
                      >
                        {/* Dummy avatar always present */}
                        <View style={{
                          width: 40, height: 40, borderRadius: 20, backgroundColor: getAvatarColor(item.replica_id),
                          alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative',
                        }}>
                          <User size={18} color={'#fff'} />
                          {/* Overlay thumbnail if available */}
                          {item.thumbnail_url && (
                            <Image
                              source={{ uri: item.thumbnail_url }}
                              style={{
                                width: 40, height: 40, borderRadius: 20, position: 'absolute', top: 0, left: 0,
                                borderWidth: 2, borderColor: '#fff',
                              }}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.replicaName, { fontSize: 16 }]} numberOfLines={1}>{item.replica_name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.model_name}</Text>
                        </View>
                        {isSelected && (
                          <CheckCircle size={22} color={colors.primary} style={{ marginLeft: 8 }} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  showsVerticalScrollIndicator={false}
                />
                <TouchableOpacity
                  style={{ marginTop: 18, alignSelf: 'center' }}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={{ color: colors.primary, fontSize: 17 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Show selected avatar's thumbnail and status */}
          {replicas.length > 0 && (
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40, backgroundColor: getAvatarColor(selectedReplica),
                alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative',
              }}>
                <User size={32} color={'#fff'} />
                {replicas.find(r => r.replica_id === selectedReplica)?.thumbnail_url && (
                  <Image
                    source={{ uri: replicas.find(r => r.replica_id === selectedReplica)?.thumbnail_url }}
                    style={{
                      width: 80, height: 80, borderRadius: 40, position: 'absolute', top: 0, left: 0,
                      borderWidth: 3, borderColor: '#fff',
                    }}
                  />
                )}
              </View>
              <Text style={styles.replicaName}>{replicas.find(r => r.replica_id === selectedReplica)?.replica_name}</Text>
              <Text style={styles.replicaStatus}>{replicas.find(r => r.replica_id === selectedReplica)?.status === 'ready' ? 'Ready' : 'Training'}</Text>
            </View>
          )}
        </View>

        {/* Customization Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Settings</Text>
          <View style={styles.customizationCard}>
            <View style={styles.customizationRow}>
              <Text style={styles.customizationLabel}>Background</Text>
              <Text style={styles.customizationValue}>{customizations.background}</Text>
            </View>
            <View style={styles.customizationRow}>
              <Text style={styles.customizationLabel}>Voice Stability</Text>
              <Text style={styles.customizationValue}>{customizations.voiceStability}</Text>
            </View>
            <View style={[styles.customizationRow, { marginBottom: 0 }]}>
              <Text style={styles.customizationLabel}>Similarity Boost</Text>
              <Text style={styles.customizationValue}>{customizations.similarityBoost}</Text>
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (isGenerating || !script.trim() || !selectedReplica) && styles.generateButtonDisabled,
          ]}
          onPress={generateVideo}
          disabled={isGenerating || !script.trim() || !selectedReplica}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Wand2 size={20} color={colors.white} />
          )}
          <Text
            style={[
              styles.generateButtonText,
              (isGenerating || !script.trim() || !selectedReplica) && styles.generateButtonTextDisabled,
            ]}
          >
            {isGenerating ? 'Generating Video...' : 'Generate Video'}
          </Text>
        </TouchableOpacity>

        {/* Video Result */}
        {generatedVideo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Video</Text>
            <View style={styles.videoResultCard}>
              <View style={styles.statusContainer}>
                {generatedVideo.status === 'generating' && (
                  <>
                    <Loader size={20} color={colors.primary} />
                    <Text style={styles.statusText}>
                      Generating...
                      {generatedVideo.generation_progress && (
                        <> {getProgressPercent(generatedVideo.generation_progress)}%</>
                      )}
                    </Text>
                  </>
                )}
                {generatedVideo.status === 'completed' && (
                  <>
                    <CheckCircle size={20} color={colors.success} />
                    <Text style={styles.statusText}>Video Ready!</Text>
                  </>
                )}
                {generatedVideo.status === 'failed' && (
                  <>
                    <XCircle size={20} color={colors.error} />
                    <Text style={styles.statusText}>Generation Failed</Text>
                  </>
                )}
              </View>

              {generatedVideo.thumbnail_url && (
                <Image
                  source={{ uri: generatedVideo.thumbnail_url }}
                  style={styles.videoThumbnail}
                />
              )}

              {generatedVideo && generatedVideo.status === 'generating' && getProgressPercent(generatedVideo.generation_progress) === 100 && (
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                  Finalizing your video. This may take a little longer. Please wait...
                </Text>
              )}

              {generatedVideo && getProgressPercent(generatedVideo.generation_progress) === 100 && generatedVideo.video_url && (
                <TouchableOpacity onPress={handlePlayVideo} style={{ marginTop: 12, alignSelf: 'center' }}>
                  <Text style={{ color: colors.primary, fontSize: 16 }}>Try to view video</Text>
                </TouchableOpacity>
              )}

              {generatedVideo.status === 'completed' && generatedVideo.video_url && (
                <View style={styles.videoActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={handlePlayVideo}>
                    <Play size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Play</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryActionButton]}
                    onPress={handleDownload}
                  >
                    <Download size={16} color={colors.text} />
                    <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
                      Download
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryActionButton]}
                    onPress={handleShare}
                  >
                    <Share size={16} color={colors.text} />
                    <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
                      Share
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}