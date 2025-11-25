import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Tag } from '../types';

interface GraphLegendProps {
  tags: Tag[];
  activeTag: string | null;
  onSelectTag: (tagName: string | null) => void;
}

const GraphLegend: React.FC<GraphLegendProps> = ({ tags, activeTag, onSelectTag }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tags</Text>
        {activeTag && (
          <Pressable onPress={() => onSelectTag(null)}>
            <Text style={styles.clear}>Reset</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tags.map((tag) => (
          <Pressable key={tag.name} onPress={() => onSelectTag(tag.name)} style={styles.tagWrapper}>
            <View style={[styles.colorDot, { backgroundColor: tag.color, opacity: activeTag && activeTag !== tag.name ? 0.3 : 1 }]} />
            <View>
              <Text style={[styles.tagName, activeTag === tag.name && styles.tagNameActive]}>{tag.name}</Text>
              <Text style={styles.tagXp}>{tag.totalXp} xp</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 14,
  },
  clear: {
    color: '#93c5fd',
    fontWeight: '600',
  },
  tagWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 10,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  tagName: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  tagNameActive: {
    color: '#ffffff',
  },
  tagXp: {
    color: '#94a3b8',
    fontSize: 12,
  },
});

export default GraphLegend;
