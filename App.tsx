
import React, { useState, useCallback } from 'react';
import { Node, Tag, Difficulty, NodeFormData } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import useWindowSize from './hooks/useWindowSize';
import GraphView from './components/GraphView';
import NodeModal from './components/NodeModal';
import GraphLegend from './components/GraphLegend';
import { XP_MAP, TAG_COLORS } from './constants';

// Let's get a stable UUID generator. Since we can't add packages, we'll use a simple one.
const simpleUUID = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

const getInitialData = (): { nodes: Node[], tags: Tag[] } => {
    // Helper for IDs
    const uuid = () => simpleUUID();

    // Domain Tags
    const tags: Tag[] = [
        { name: "Frontend", color: TAG_COLORS[6], totalXp: 0 }, // blue
        { name: "Backend", color: TAG_COLORS[10], totalXp: 0 }, // emerald
        { name: "DevOps", color: TAG_COLORS[14], totalXp: 0 }, // orange
        { name: "Design", color: TAG_COLORS[1], totalXp: 0 },   // pink
        { name: "CS Concepts", color: TAG_COLORS[8], totalXp: 0 }, // cyan
    ];

    // Nodes
    const nodes: Node[] = [];
    
    // Helper to add node
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

    // CS Concepts
    const algorithms = addNode("Algorithms", "CS Concepts", Difficulty.Medium, "Sorting, searching, and graph traversals.");
    const dataStructures = addNode("Data Structures", "CS Concepts", Difficulty.Medium, "Arrays, Linked Lists, Trees, Hash Maps.");
    const bigO = addNode("Big O Notation", "CS Concepts", Difficulty.Easy, "Understanding time and space complexity.", [algorithms, dataStructures]);

    // Frontend
    const html = addNode("HTML5", "Frontend", Difficulty.Easy, "Semantic markup and structure.");
    const css = addNode("CSS3", "Frontend", Difficulty.Easy, "Styling, Flexbox, Grid.", [html]);
    const js = addNode("JavaScript", "Frontend", Difficulty.Medium, "ES6+, DOM manipulation, Event Loop.", [html, css, bigO]);
    const react = addNode("React", "Frontend", Difficulty.Medium, "Components, Hooks, State Management.", [js]);
    const ts = addNode("TypeScript", "Frontend", Difficulty.Hard, "Static typing for JS.", [js, react]);
    const d3node = addNode("D3.js", "Frontend", Difficulty.Hard, "Data visualization library.", [js]);

    // Backend
    const nodejs = addNode("Node.js", "Backend", Difficulty.Medium, "JS runtime environment.", [js]);
    const express = addNode("Express", "Backend", Difficulty.Easy, "Web framework for Node.", [nodejs]);
    const sql = addNode("SQL", "Backend", Difficulty.Medium, "Relational database querying.");
    const rest = addNode("REST APIs", "Backend", Difficulty.Medium, "API design principles.", [express]);
    
    // DevOps
    const git = addNode("Git", "DevOps", Difficulty.Easy, "Version control.");
    const docker = addNode("Docker", "DevOps", Difficulty.Medium, "Containerization.", [nodejs]);
    const ciCd = addNode("CI/CD", "DevOps", Difficulty.Hard, "Automated pipelines.", [git, docker]);

    // Design
    const figma = addNode("Figma", "Design", Difficulty.Easy, "UI design tool.");
    const uiux = addNode("UI/UX Principles", "Design", Difficulty.Medium, "User centered design.", [figma, html]);

    // Calculate initial XP for tags
    nodes.forEach(n => {
        const t = tags.find(tag => tag.name === n.tags[0]);
        if(t) t.totalXp += n.xp;
    });

    return { nodes, tags };
};

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

function App() {
  const { width, height } = useWindowSize();
  const [nodes, setNodes] = useLocalStorage<Node[]>('skillseed-nodes', getInitialData().nodes);
  const [tags, setTags] = useLocalStorage<Tag[]>('skillseed-tags', getInitialData().tags);
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

    // Initialize with existing colors
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
    setNodes(prevNodes => {
      // Link parsing from description
      const linkRegex = /\[\[(.*?)\]\]/g;
      const linkedNodeIds = new Set<string>();
      let match;
      while ((match = linkRegex.exec(nodeData.description || '')) !== null) {
          const linkedTitle = match[1].trim();
          if (linkedTitle) {
              const linkedNode = prevNodes.find(n => n.title.toLowerCase() === linkedTitle.toLowerCase());
              if (linkedNode && linkedNode.id !== id) { // ensure it exists and isn't the node itself
                  linkedNodeIds.add(linkedNode.id);
              }
          }
      }
      const links = Array.from(linkedNodeIds);

      let updatedNodes;
      const xp = XP_MAP[nodeData.difficulty];

      if (id) { // Editing existing node
        updatedNodes = prevNodes.map(n => n.id === id ? { ...n, ...nodeData, links, xp } : n);
      } else { // Adding new node
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
     if (window.confirm("Are you sure you want to delete this skill? This cannot be undone.")) {
        setNodes(prevNodes => {
            const newNodes = prevNodes.filter(n => n.id !== id);
             // Also remove links to this node from other nodes
            const finalNodes = newNodes.map(n => ({...n, links: n.links.filter(linkId => linkId !== id) }));
            updateTags(finalNodes);
            return finalNodes;
        });
        closeModal();
     }
  };

  const visibleTags = activeTag ? tags.filter(t => t.name === activeTag) : tags;
  const visibleNodes = activeTag ? nodes.filter(n => n.tags.includes(activeTag)) : nodes;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900 touch-none">
      <div className="absolute top-4 left-4 z-10 pointer-events-none max-w-[70%]">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wider pointer-events-auto">SkillSeed Graph</h1>
        <p className="text-gray-400 text-xs sm:text-sm pointer-events-auto hidden sm:block">Visualize your knowledge growth.</p>
        {activeTag && (
             <button 
                onClick={() => setActiveTag(null)}
                className="mt-2 text-xs bg-gray-800 text-indigo-400 px-3 py-1.5 rounded border border-indigo-900 hover:bg-gray-700 pointer-events-auto shadow-sm"
             >
                &larr; Back to Overview
             </button>
        )}
      </div>

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
      
      <button
        onClick={openAddNodeModal}
        className="absolute bottom-4 right-4 z-20 bg-indigo-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-transform transform hover:scale-110 active:scale-95"
        aria-label="Add new skill"
      >
        <PlusIcon />
      </button>

      <NodeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
        nodeToEdit={selectedNode}
        allTags={tags}
        allNodes={nodes}
      />
    </div>
  );
}

export default App;
