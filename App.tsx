import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Node, Tag, Difficulty, NodeFormData } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import useWindowSize from './hooks/useWindowSize';
import GraphView from './components/GraphView';
import NodeModal from './components/NodeModal';
import GraphLegend from './components/GraphLegend';
import { XP_MAP, TAG_COLORS } from './constants';
import { v4 as uuidv4 } from 'uuid';

const simpleUUID = () => uuidv4();

const getInitialData = (): { nodes: Node[]; tags: Tag[] } => {
  const tags: Tag[] = [
    { name: 'Frontend', color: TAG_COLORS[6], totalXp: 0 },
    { name: 'Backend', color: TAG_COLORS[10], totalXp: 0 },
    { name: 'DevOps', color: TAG_COLORS[14], totalXp: 0 },
    { name: 'Design', color: TAG_COLORS[1], totalXp: 0 },
    { name: 'CS Concepts', color: TAG_COLORS[8], totalXp: 0 },
  ];

  const nodes: Node[] = [];
  const addNode = (title: string, tag: string, diff: Difficulty, desc: string, links: string[] = []) => {
    const id = simpleUUID();
    nodes.push({
      id,
      title,
      description: desc,
      tags: [tag],
      difficulty: diff,
      xp: XP_MAP[diff],
      links,
      createdAt: new Date().toISOString(),
    });
    return id;
  };

  const algorithms = addNode('Algorithms', 'CS Concepts', Difficulty.Medium, 'Sorting, searching, and graph traversals.');
  const dataStructures = addNode('Data Structures', 'CS Concepts', Difficulty.Medium, 'Arrays, Linked Lists, Trees, Hash Maps.');
  addNode('Big O Notation', 'CS Concepts', Difficulty.Easy, 'Understanding time and space complexity.', [algorithms, dataStructures]);

  const html = addNode('HTML5', 'Frontend', Difficulty.Easy, 'Semantic markup and structure.');
  const css = addNode('CSS3', 'Frontend', Difficulty.Easy, 'Styling, Flexbox, Grid.', [html]);
  const js = addNode('JavaScript', 'Frontend', Difficulty.Medium, 'ES6+, DOM manipulation, Event Loop.', [html, css]);
  addNode('React', 'Frontend', Difficulty.Medium, 'Components, Hooks, State Management.', [js]);
  addNode('TypeScript', 'Frontend', Difficulty.Hard, 'Static typing for JS.', [js]);
  addNode('D3.js', 'Frontend', Difficulty.Hard, 'Data visualization library.', [js]);

  const nodejs = addNode('Node.js', 'Backend', Difficulty.Medium, 'JS runtime environment.', [js]);
  addNode('Express', 'Backend', Difficulty.Easy, 'Web framework for Node.', [nodejs]);
  addNode('SQL', 'Backend', Difficulty.Medium, 'Relational database querying.');
  addNode('REST APIs', 'Backend', Difficulty.Medium, 'API design principles.', [nodejs]);

  addNode('Git', 'DevOps', Difficulty.Easy, 'Version control.');
  addNode('Docker', 'DevOps', Difficulty.Medium, 'Containerization.', [nodejs]);
  addNode('CI/CD', 'DevOps', Difficulty.Hard, 'Automated pipelines.');

  addNode('Figma', 'Design', Difficulty.Easy, 'UI design tool.');
  addNode('UI/UX Principles', 'Design', Difficulty.Medium, 'User centered design.', [html]);

  nodes.forEach((n) => {
    const t = tags.find((tag) => tag.name === n.tags[0]);
    if (t) t.totalXp += n.xp;
  });

  return { nodes, tags };
};

export default function App() {
  const { width, height } = useWindowSize();
  const [nodes, setNodes, hydratedNodes] = useLocalStorage<Node[]>('skillseed-nodes', getInitialData().nodes);
  const [tags, setTags, hydratedTags] = useLocalStorage<Tag[]>('skillseed-tags', getInitialData().tags);
  const hydrated = hydratedNodes && hydratedTags;

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const visibleTags = useMemo(() => (activeTag ? tags.filter((t) => t.name === activeTag) : tags), [activeTag, tags]);
  const visibleNodes = useMemo(
    () => (activeTag ? nodes.filter((n) => n.tags.includes(activeTag)) : nodes),
    [activeTag, nodes]
  );

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  }, []);

  const handleTagClick = useCallback((tagName: string) => {
    setActiveTag(tagName);
    setIsModalOpen(false);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    if (activeTag) {
      setActiveTag(null);
    }
  }, [activeTag]);

  const openAddNodeModal = () => {
    setSelectedNode(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedNode(null);
  };

  const updateTags = (newNodes: Node[]) => {
    const newTagsMap = new Map<string, { totalXp: number; color: string }>();
    tags.forEach((tag) => newTagsMap.set(tag.name, { totalXp: 0, color: tag.color }));

    newNodes.forEach((node) => {
      node.tags.forEach((tagName) => {
        if (!newTagsMap.has(tagName)) {
          const newColor = TAG_COLORS[newTagsMap.size % TAG_COLORS.length];
          newTagsMap.set(tagName, { totalXp: 0, color: newColor });
        }
        const currentTag = newTagsMap.get(tagName)!;
        currentTag.totalXp += node.xp;
      });
    });

    const sortedTags = Array.from(newTagsMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setTags(sortedTags);
  };

  const handleSaveNode = (nodeData: NodeFormData, id?: string) => {
    setNodes((prevNodes) => {
      const linkedNodeIds = new Set<string>();
      const linkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = linkRegex.exec(nodeData.description || '')) !== null) {
        const linkedTitle = match[1].trim();
        if (linkedTitle) {
          const linkedNode = prevNodes.find((n) => n.title.toLowerCase() === linkedTitle.toLowerCase());
          if (linkedNode && linkedNode.id !== id) {
            linkedNodeIds.add(linkedNode.id);
          }
        }
      }
      const links = Array.from(linkedNodeIds);
      const xp = XP_MAP[nodeData.difficulty];

      let updatedNodes: Node[];
      if (id) {
        updatedNodes = prevNodes.map((n) => (n.id === id ? { ...n, ...nodeData, links, xp } : n));
      } else {
        const newNode: Node = {
          ...nodeData,
          id: simpleUUID(),
          createdAt: new Date().toISOString(),
          links,
          xp,
        };
        updatedNodes = [...prevNodes, newNode];
      }
      updateTags(updatedNodes);
      return updatedNodes;
    });
    closeModal();
  };

  const handleDeleteNode = (id: string) => {
    Alert.alert('Delete skill', 'Are you sure you want to delete this skill?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setNodes((prevNodes) => {
            const newNodes = prevNodes.filter((n) => n.id !== id);
            const finalNodes = newNodes.map((n) => ({ ...n, links: n.links.filter((linkId) => linkId !== id) }));
            updateTags(finalNodes);
            return finalNodes;
          });
          closeModal();
        },
      },
    ]);
  };

  const graphHeight = Math.max(height - 200, 320);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SkillSeed Graph</Text>
          <Text style={styles.subtitle}>Visualize your knowledge growth.</Text>
        </View>
        <Pressable onPress={openAddNodeModal} style={styles.addButton}>
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {!hydrated ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color="#93c5fd" />
          <Text style={styles.loaderText}>Loading your graph…</Text>
        </View>
      ) : (
        <>
          <View style={{ height: graphHeight }}>
            <GraphView
              nodes={visibleNodes}
              tags={visibleTags}
              onNodeClick={handleNodeClick}
              onTagClick={handleTagClick}
              onBackgroundClick={handleBackgroundClick}
              activeTag={activeTag}
              width={width}
              height={graphHeight}
            />
          </View>
          <GraphLegend tags={tags} activeTag={activeTag} onSelectTag={setActiveTag} />
        </>
      )}

      <NodeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
        nodeToEdit={selectedNode}
        allTags={tags}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#cbd5e1',
  },
});
