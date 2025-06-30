import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export function SearchSuggestionCard({ prompt, category, onPress }: {
  prompt: string;
  category: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <Text style={styles.promptText} numberOfLines={4} ellipsizeMode="tail">
        {prompt}
      </Text>
      <View style={styles.categoryPill}>
        <Text style={styles.categoryText}>{category}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#23272F',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  promptText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter-Medium',
    lineHeight: 22,
    letterSpacing: 0.1,
    marginBottom: 12,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#10A37F',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
}); 