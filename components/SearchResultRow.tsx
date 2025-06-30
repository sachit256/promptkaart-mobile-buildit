import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export function SearchResultRow({ prompt, onPress }: { prompt: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.promptText} numberOfLines={4} ellipsizeMode="tail">
        {prompt}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#23272F', // Modern dark card
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
  },
}); 