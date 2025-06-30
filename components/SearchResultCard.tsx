import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TrendingUp, Brain, Wand as Wand2 } from 'lucide-react-native';

interface SearchResultCardProps {
  title: string;
  description?: string;
  prompt: string;
  category: string;
  tags?: string[];
  aiSource?: string;
  trending?: boolean;
  difficulty?: string;
  onPress: () => void;
  buttonLabel?: string;
  colors: any;
}

export function SearchResultCard({
  title,
  description,
  prompt,
  category,
  tags = [],
  aiSource,
  trending = false,
  difficulty,
  onPress,
  buttonLabel = 'View Details',
  colors,
}: SearchResultCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getAISourceColor = (aiSource: string) => {
    switch (aiSource) {
      case 'chatgpt': return '#10A37F';
      case 'gemini': return '#4285F4';
      case 'grok': return '#1DA1F2';
      default: return colors.primary;
    }
  };

  return (
    <View style={[styles.suggestionCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.black }]}> 
      <View style={styles.suggestionHeader}>
        <Text style={[styles.suggestionTitle, { color: colors.text }]}>{title}</Text>
        {trending && (
          <View style={[styles.trendingBadge, { backgroundColor: colors.error + '20' }]}> 
            <TrendingUp size={10} color={colors.error} />
            <Text style={[styles.trendingText, { color: colors.error }]}>TRENDING</Text>
          </View>
        )}
      </View>

      {description && <Text style={[styles.suggestionDescription, { color: colors.textSecondary }]}>{description}</Text>}

      <Text style={[styles.suggestionPrompt, { backgroundColor: colors.surfaceVariant, color: colors.text }]} numberOfLines={4} ellipsizeMode="tail">
        {prompt}
      </Text>

      <View style={styles.suggestionMeta}>
        <View style={styles.metaLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}> 
            <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{category}</Text>
          </View>
          {difficulty && (
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(difficulty) + '20' }]}> 
              <Text style={[styles.difficultyText, { color: getDifficultyColor(difficulty) }]}>{difficulty.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {aiSource && (
          <View style={[styles.aiSourceBadge, { backgroundColor: getAISourceColor(aiSource) + '20' }]}> 
            <Brain size={10} color={getAISourceColor(aiSource)} />
            <Text style={[styles.aiSourceText, { color: getAISourceColor(aiSource) }]}>{aiSource.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: colors.surfaceVariant }]}> 
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.useButton, { backgroundColor: colors.primary }]} onPress={onPress}>
        <Wand2 size={16} color={colors.white} />
        <Text style={[styles.useButtonText, { color: colors.white }]}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  suggestionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suggestionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
    marginRight: 12,
  },
  trendingBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  suggestionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  suggestionPrompt: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  suggestionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  difficultyBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  aiSourceBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiSourceText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  useButton: {
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
}); 