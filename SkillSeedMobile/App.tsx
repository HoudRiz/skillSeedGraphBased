
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, useWindowDimensions, Alert } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import tw from 'twrnc';
import { Node, Tag, Difficulty, NodeFormData } from './types';
import useAsyncStorage from './hooks/useAsyncStorage';
import GraphView from './components/GraphView';
import NodeModal from './components/NodeModal';
import GraphLegend from './components/GraphLegend';
import { XP_MAP, TAG_COLORS } from './constants';

// Stable UUID generator
const simpleUUID = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const getInitialData = (): { nodes: Node[], tags: Tag[] } => {
  const uuid = () => simpleUUID();

  const tags: Tag[] = [
    { name: "Frontend", color: TAG_COLORS[6], totalXp: 0 },
    { name: "Backend", color: TAG_COLORS[10], totalXp: 0 },
    { name: "DevOps", color: TAG_COLORS[14], totalXp: 0 },
    { name: "Design", color: TAG_COLORS[1], totalXp: 0 },
    { name: "CS Concepts", color: TAG_COLORS[8], totalXp: 0 },
  ];

  const nodes: Node[] = [];

  const addNode = (title: string, tag: string, diff: Difficulty, desc: string, links: string[] = []) => {
    const id = uuid();
    nodes.push({
      id,
      title,
      description: desc,
      tags: [tag],
      difficulty: diff,
      xp: XP_MAP[diff],
      links,
      createdAt: new Date().toISOString()
    });
    return id;
  };

  const algorithms = addNode("Algorithms", "CS Concepts", Difficulty.Medium, "Sorting, searching, and graph traversals.");
  const dataStructures = addNode("Data Structures", "CS Concepts", Difficulty.Medium, "Arrays, Linked Lists, Trees, Hash Maps.");
  const bigO = addNode("Big O Notation", "CS Concepts", Difficulty.Easy, "Understanding time and space complexity.", [algorithms, dataStructures]);

  const html = addNode("HTML5", "Frontend", Difficulty.Easy, "Semantic markup and structure.");
  const css = addNode("CSS3", "Frontend", Difficulty.Easy, "Styling, Flexbox, Grid.", [html]);
  const js = addNode("JavaScript", "Frontend", Difficulty.Medium, "ES6+, DOM manipulation, Event Loop.", [html, css, bigO]);
  const react = addNode("React", "Frontend", Difficulty.Medium, "Components, Hooks, State Management.", [js]);
  const ts = addNode("TypeScript", "Frontend", Difficulty.Hard, "Static typing for JS.", [js, react]);
  const d3node = addNode("D3.js", "Frontend", Difficulty.Hard, "Data visualization library.", [js]);

  const nodejs = addNode("Node.js", "Backend", Difficulty.Medium, "JS runtime environment.", [js]);
  const express = addNode("Express", "Backend", Difficulty.Easy, "Web framework for Node.", [nodejs]);
  const sql = addNode("SQL", "Backend", Difficulty.Medium, "Relational database querying.");
  const rest = addNode("REST APIs", "Backend", Difficulty.Medium, "API design principles.", [express]);

  const git = addNode("Git", "DevOps", Difficulty.Easy, "Version control.");
  const docker = addNode("Docker", "DevOps", Difficulty.Medium, "Containerization.", [nodejs]);
  const ciCd = addNode("CI/CD", "DevOps", Difficulty.Hard, "Automated pipelines.", [git, docker]);

  const figma = addNode("Figma", "Design", Difficulty.Easy, "UI design tool.");
  const uiux = addNode("UI/UX Principles", "Design", Difficulty.Medium, "User centered design.", [figma, html]);

  nodes.forEach(n => {
    const t = tags.find(tag => tag.name === n.tags[0]);
    if (t) t.totalXp += n.xp;
  });

  return { nodes, tags };
};

const PlusIcon = () => (
  <Svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </Svg>
);

export default function App() {
  const { width, height } = useWindowDimensions();
  const initialData = getInitialData();
  const [nodes, setNodes, nodesLoaded] = useAsyncStorage<Node[]>('skillseed-nodes', initialData.nodes);
  const [tags, setTags, tagsLoaded] = useAsyncStorage<Tag[]>('skillseed-tags', initialData.tags);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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
    const newTagsMap = new Map<string, { totalXp: number, color: string }>();

    tags.forEach(tag => newTagsMap.set(tag.name, { totalXp: 0, color: tag.color }));

    newNodes.forEach(node => {
      node.tags.forEach(tagName => {
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
    // We need to get the current nodes value. Since setNodes gives us the previous value in the callback, we can use that.
    // However, useAsyncStorage setter supports function updates.
    setNodes((prevNodes: Node[]) => {
      const linkRegex = /\[\[(.*?)\]\]/g;
      const linkedNodeIds = new Set<string>();
      let match;
      while ((match = linkRegex.exec(nodeData.description || '')) !== null) {
        const linkedTitle = match[1].trim();
        if (linkedTitle) {
          const linkedNode = prevNodes.find(n => n.title.toLowerCase() === linkedTitle.toLowerCase());
          if (linkedNode && linkedNode.id !== id) {
            linkedNodeIds.add(linkedNode.id);
          }
        }
      }
      const links = Array.from(linkedNodeIds);

      let updatedNodes;
      const xp = XP_MAP[nodeData.difficulty];

      if (id) {
        updatedNodes = prevNodes.map(n => n.id === id ? { ...n, ...nodeData, links, xp } : n);
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
      // Note: We can't easily call updateTags here because it depends on 'tags' state which might be stale if we are inside a callback.
      // But updateTags updates 'tags' state.
      // Ideally we should refactor updateTags to be pure or use a useEffect.
      // For now, we will do a trick: we will call updateTags outside this setter, but we need the new nodes.
      // Actually, let's just update tags in a useEffect dependent on nodes? 
      // No, that might cause loops if not careful.
      // Let's just trigger it.
      setTimeout(() => updateTags(updatedNodes), 0);

      return updatedNodes;
    });
    closeModal();
  };

  const handleDeleteNode = (id: string) => {
    Alert.alert(
      "Delete Skill",
      "Are you sure you want to delete this skill? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: () => {
            setNodes((prevNodes: Node[]) => {
              const newNodes = prevNodes.filter(n => n.id !== id);
              const finalNodes = newNodes.map(n => ({ ...n, links: n.links.filter(linkId => linkId !== id) }));
              setTimeout(() => updateTags(finalNodes), 0);
              return finalNodes;
            });
            closeModal();
          }
        }
      ]
    );
  };

  const visibleTags = activeTag ? tags.filter(t => t.name === activeTag) : tags;
  const visibleNodes = activeTag ? nodes.filter(n => n.tags.includes(activeTag)) : nodes;

  if (!nodesLoaded || !tagsLoaded) {
    return <View style={tw`flex-1 bg-gray-900 justify-center items-center`}><Text style={tw`text-white`}>Loading...</Text></View>;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-900`}>
      <StatusBar barStyle="light-content" />
      <View style={tw`relative flex-1`}>
        <View style={tw`absolute top-4 left-4 z-10 max-w-[70%]`}>
          <Text style={tw`text-xl font-bold text-white tracking-wider`}>SkillSeed Graph</Text>
          <Text style={tw`text-gray-400 text-xs hidden sm:flex`}>Visualize your knowledge growth.</Text>
          {activeTag && (
            <TouchableOpacity
              onPress={() => setActiveTag(null)}
              style={tw`mt-2 bg-gray-800 border border-indigo-900 px-3 py-1.5 rounded shadow-sm`}
            >
              <Text style={tw`text-xs text-indigo-400`}>&larr; Back to Overview</Text>
            </TouchableOpacity>
          )}
        </View>

        <GraphView
          nodes={visibleNodes}
          tags={visibleTags}
          onNodeClick={handleNodeClick}
          onTagClick={handleTagClick}
          onBackgroundClick={handleBackgroundClick}
          activeTag={activeTag}
          width={width}
          height={height}
        />

        <GraphLegend tags={tags} />

        <TouchableOpacity
          onPress={openAddNodeModal}
          style={tw`absolute bottom-4 right-4 z-20 bg-indigo-600 rounded-full p-4 shadow-lg`}
          accessibilityLabel="Add new skill"
        >
          <PlusIcon />
        </TouchableOpacity>

        <NodeModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          nodeToEdit={selectedNode}
          allTags={tags}
          allNodes={nodes}
        />
      </View>
    </SafeAreaView>
  );
}
