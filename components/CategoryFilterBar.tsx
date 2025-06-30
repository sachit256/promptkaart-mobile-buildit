import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export function CategoryFilterBar({ categories, selectedCategory, onSelect }: {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.pill, selectedCategory === category && styles.selectedPill]}
            onPress={() => onSelect(category)}
            activeOpacity={0.85}
          >
            <Text style={[styles.pillText, selectedCategory === category && styles.selectedPillText]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingLeft: 16,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  pill: {
    backgroundColor: '#23272F',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedPill: {
    backgroundColor: '#10A37F',
    borderColor: '#10A37F',
  },
  pillText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  selectedPillText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 