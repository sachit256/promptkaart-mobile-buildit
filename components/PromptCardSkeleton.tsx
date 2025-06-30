import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export function PromptCardSkeleton() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      marginRight: 12,
    },
    authorInfo: {
      flex: 1,
    },
    line: {
      height: 14,
      borderRadius: 4,
      backgroundColor: colors.surfaceVariant,
    },
    lineShort: {
      width: '60%',
    },
    lineLong: {
      width: '90%',
      marginTop: 6,
    },
    imagePlaceholder: {
      height: 200,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      marginBottom: 16,
    },
    textBlock: {
      height: 12,
      borderRadius: 4,
      backgroundColor: colors.surfaceVariant,
      marginBottom: 8,
    },
    textBlockShort: {
      width: '70%',
    },
    textBlockMedium: {
      width: '90%',
    },
    textBlockLong: {
      width: '100%',
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={styles.authorInfo}>
          <View style={[styles.line, styles.lineShort]} />
          <View style={[styles.line, styles.lineLong]} />
        </View>
      </View>
      <View style={styles.imagePlaceholder} />
      <View style={[styles.textBlock, styles.textBlockLong]} />
      <View style={[styles.textBlock, styles.textBlockMedium]} />
      <View style={[styles.textBlock, styles.textBlockShort]} />
    </View>
  );
} 