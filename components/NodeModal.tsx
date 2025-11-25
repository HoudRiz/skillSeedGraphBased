import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { Difficulty, Node, NodeFormData, Tag } from '../types';
import { DIFFICULTY_LEVELS } from '../constants';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeData: NodeFormData, id?: string) => void;
  onDelete: (id: string) => void;
  nodeToEdit: Node | null;
  allTags: Tag[];
}

const initialFormData: NodeFormData = {
  title: 'Untitled',
  description: '',
  tags: [],
  difficulty: Difficulty.Easy,
};

const NodeModal: React.FC<NodeModalProps> = ({ isOpen, onClose, onSave, onDelete, nodeToEdit, allTags }) => {
  const [formData, setFormData] = useState<NodeFormData>(initialFormData);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (nodeToEdit) {
      setFormData({
        title: nodeToEdit.title,
        description: nodeToEdit.description || '',
        tags: [...nodeToEdit.tags],
        difficulty: nodeToEdit.difficulty,
      });
      setTagInput(nodeToEdit.tags.join(', '));
    } else {
      setFormData(initialFormData);
      setTagInput('');
    }
  }, [nodeToEdit, isOpen]);

  const handleSave = () => {
    const cleanedTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: NodeFormData = {
      ...formData,
      tags: cleanedTags.length > 0 ? cleanedTags : formData.tags.length ? formData.tags : [allTags[0]?.name || 'General'],
    };

    onSave(payload, nodeToEdit?.id);
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.heading}>{nodeToEdit ? 'Edit Skill' : 'New Skill'}</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
              placeholder="Title"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              placeholder="Notes, links, or context"
              placeholderTextColor="#94a3b8"
              multiline
            />

            <Text style={styles.label}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Frontend, Backend"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setFormData((prev) => ({ ...prev, difficulty: level }))}
                  style={[styles.difficultyPill, formData.difficulty === level && styles.difficultyPillActive]}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      formData.difficulty === level && styles.difficultyTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actions}>
              {nodeToEdit && (
                <Pressable onPress={() => onDelete(nodeToEdit.id)} style={[styles.button, styles.deleteButton]}>
                  <Text style={styles.buttonText}>Delete</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.button, styles.primaryButton]}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#0b1224',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  content: {
    padding: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#111827',
    color: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  difficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  difficultyPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  difficultyText: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  difficultyTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default NodeModal;
