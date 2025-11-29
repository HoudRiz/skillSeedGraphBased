
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, useWindowDimensions, Alert } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import tw from 'twrnc';
import { Node, Tag, Difficulty, NodeFormData, Vault } from './types';
import useAsyncStorage from './hooks/useAsyncStorage';
import { isUnassigned } from './utils';
import GraphView from './components/GraphView';
import NodeModal from './components/NodeModal';
import Sidebar from './components/Sidebar';

import { XP_MAP, TAG_COLORS } from './constants';

// Stable UUID generator
const simpleUUID = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const getInitialData = (): { nodes: Node[], tags: Tag[] } => {
  return { nodes: [], tags: [] };
};

const PlusIcon = () => (
  <Svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#818cf8">
    <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </Svg>
);

export default function App() {
  const { width, height } = useWindowDimensions();
  const initialData = getInitialData();
  const [nodes, setNodes, nodesLoaded] = useAsyncStorage<Node[]>('skillseed-nodes', initialData.nodes);
  const [tags, setTags, tagsLoaded] = useAsyncStorage<Tag[]>('skillseed-tags', initialData.tags);
  const [vaults, setVaults, vaultsLoaded] = useAsyncStorage<Vault[]>('skillseed-vaults', []);
  const [currentVaultId, setCurrentVaultId, currentVaultIdLoaded] = useAsyncStorage<string | null>('skillseed-current-vault', null);
  const [activeTag, setActiveTag] = useState<string | null | 'UNASSIGNED'>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Vault-filtered data
  const currentVaultNodes = useMemo(
    () => nodes.filter(n => n.vaultId === currentVaultId),
    [nodes, currentVaultId]
  );

  const currentVaultTags = useMemo(
    () => tags.filter(t => t.vaultId === currentVaultId),
    [tags, currentVaultId]
  );

  // Initialize vaults on first load
  useEffect(() => {
    if (!vaultsLoaded || !currentVaultIdLoaded) return;

    // If no vaults exist, create a default vault
    if (vaults.length === 0) {
      const defaultVault: Vault = {
        id: simpleUUID(),
        name: "Default",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVaults([defaultVault]);
      setCurrentVaultId(defaultVault.id);
    } else if (!currentVaultId || !vaults.find(v => v.id === currentVaultId)) {
      // If currentVaultId is invalid, set to first vault
      setCurrentVaultId(vaults[0].id);
    }
  }, [vaults, vaultsLoaded, currentVaultId, currentVaultIdLoaded, setVaults, setCurrentVaultId]);

  // Migrate existing nodes/tags without vaultId to current vault
  useEffect(() => {
    if (!nodesLoaded || !tagsLoaded || !vaultsLoaded || !currentVaultId) return;

    const needsMigration = nodes.some(n => !n.vaultId) || tags.some(t => !t.vaultId);
    if (needsMigration) {
      setNodes(prev => prev.map(n => n.vaultId ? n : { ...n, vaultId: currentVaultId }));
      setTags(prev => prev.map(t => t.vaultId ? t : { ...t, vaultId: currentVaultId }));
    }
  }, [nodes, tags, nodesLoaded, tagsLoaded, vaultsLoaded, currentVaultId, setNodes, setTags]);

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  }, []);

  const handleTagClick = useCallback((tagName: string | 'UNASSIGNED') => {
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

  const updateTags = (newNodes: Node[], currentTags: Tag[] = tags) => {
    if (!currentVaultId) return;

    const newTagsMap = new Map<string, { totalXp: number, color: string, vaultId: string }>();

    // Initialize with existing tags from current vault
    currentTags.filter(tag => tag.vaultId === currentVaultId).forEach(tag =>
      newTagsMap.set(tag.name, { totalXp: 0, color: tag.color, vaultId: currentVaultId })
    );

    // Calculate totals from nodes in current vault
    newNodes.filter(node => node.vaultId === currentVaultId).forEach(node => {
      // Skip unassigned nodes for tag totals
      if (node.tags.length === 0) return;

      node.tags.forEach(tagName => {
        if (!newTagsMap.has(tagName)) {
          const newColor = TAG_COLORS[newTagsMap.size % TAG_COLORS.length];
          newTagsMap.set(tagName, { totalXp: 0, color: newColor, vaultId: currentVaultId });
        }
        const currentTag = newTagsMap.get(tagName)!;
        currentTag.totalXp += node.xp;
      });
    });

    const sortedTags = Array.from(newTagsMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Merge with tags from other vaults
    const otherVaultTags = currentTags.filter(tag => tag.vaultId !== currentVaultId);
    setTags([...otherVaultTags, ...sortedTags]);
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
          vaultId: currentVaultId!,
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

  const handleReset = () => {
    Alert.alert(
      "Reset Current Vault",
      `Are you sure? This will delete all nodes and tags in the current vault (${vaults.find(v => v.id === currentVaultId)?.name}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset", style: "destructive", onPress: () => {
            // Delete all nodes and tags from current vault
            setNodes(prev => prev.filter(n => n.vaultId !== currentVaultId));
            setTags(prev => prev.filter(t => t.vaultId !== currentVaultId));
            setIsSidebarOpen(false);
          }
        }
      ]
    );
  };

  const handleExport = () => {
    Alert.alert("Export", "Data export functionality coming soon!");
  };

  const handleImport = () => {
    Alert.alert("Import", "Data import functionality coming soon!");
  };

  const handleDeleteTag = (tagName: string) => {
    Alert.alert(
      "Delete Tag",
      `Are you sure you want to delete "${tagName}"? Nodes with only this tag will become unassigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: () => {
            // Remove tag from current vault only
            const newTagsList = tags.filter(t => !(t.name === tagName && t.vaultId === currentVaultId));
            setTags(newTagsList);

            // Update all nodes that reference this tag
            setNodes((prevNodes: Node[]) => {
              const updatedNodes = prevNodes.map(node => {
                if (!node.tags.includes(tagName)) {
                  return node; // Node doesn't use this tag, skip
                }

                // Remove the deleted tag from the node's tags array
                const newTags = node.tags.filter(t => t !== tagName);

                // If newTags is empty, the node is now unassigned (tags: [])
                // If newTags has items, the first one (newTags[0]) automatically becomes the primary tag

                return { ...node, tags: newTags };
              });

              // Update tag totals with the new tags list
              setTimeout(() => updateTags(updatedNodes, newTagsList), 0);
              return updatedNodes;
            });

            // If we're currently viewing the deleted tag, go back to overview
            if (activeTag === tagName) {
              setActiveTag(null);
            }
          }
        }
      ]
    );
  };

  const handleEditTag = (oldTagName: string, newTagName: string, newColor: string) => {
    // 1. Update the tag in the tags list (current vault only)
    const newTagsList = tags.map(t =>
      t.name === oldTagName && t.vaultId === currentVaultId
        ? { ...t, name: newTagName, color: newColor }
        : t
    );
    setTags(newTagsList);

    // 2. Update all nodes that use this tag
    setNodes((prevNodes: Node[]) => {
      const updatedNodes = prevNodes.map(node => {
        if (!node.tags.includes(oldTagName)) {
          return node;
        }

        const newTags = node.tags.map(t => t === oldTagName ? newTagName : t);
        return { ...node, tags: newTags };
      });

      // Update totals (though totals shouldn't change, just names/colors)
      // But updateTags recalculates everything so it's safe
      setTimeout(() => updateTags(updatedNodes, newTagsList), 0);
      return updatedNodes;
    });

    // 3. Update activeTag if needed
    if (activeTag === oldTagName) {
      setActiveTag(newTagName);
    }
  };

  // Visibility state is per-vault
  const visibilityKey = currentVaultId ? `skillseed-visible-tags-${currentVaultId}` : 'skillseed-visible-tags-default';
  const [visibleTagsState, setVisibleTagsState, visibleTagsLoaded] = useAsyncStorage<Record<string, boolean>>(visibilityKey, {});

  // Initialize visibleTagsState when tags change, but preserve existing keys
  useEffect(() => {
    if (!tagsLoaded || !visibleTagsLoaded || !currentVaultId) return;

    setVisibleTagsState(prev => {
      const next = { ...prev };
      // Ensure UNASSIGNED key exists
      if (next['UNASSIGNED'] === undefined) {
        next['UNASSIGNED'] = true;
      }
      // Ensure all tags from current vault have keys
      currentVaultTags.forEach(t => {
        if (next[t.name] === undefined) {
          next[t.name] = true;
        }
      });
      return next;
    });
  }, [currentVaultTags, tagsLoaded, visibleTagsLoaded, currentVaultId, setVisibleTagsState]);

  const handleToggleTagVisibility = useCallback((tagName: string) => {
    setVisibleTagsState(prev => ({
      ...prev,
      [tagName]: !prev[tagName]
    }));
  }, [setVisibleTagsState]);

  const visibleTags = activeTag && activeTag !== 'UNASSIGNED' ? currentVaultTags.filter(t => t.name === activeTag) : currentVaultTags;

  // Filter nodes based on visibility state AND active tag (current vault only)
  const visibleNodes = currentVaultNodes.filter(n => {
    // 1. Filter by active tag (zoom)
    if (activeTag === 'UNASSIGNED') {
      if (!isUnassigned(n)) return false;
    } else if (activeTag) {
      if (!n.tags.includes(activeTag)) return false;
    }

    // 2. Filter by visibility toggles
    if (isUnassigned(n)) {
      if (visibleTagsState['UNASSIGNED'] === false) return false;
    } else {
      const primaryTag = n.tags[0];
      // If the primary tag is hidden, hide the node
      if (visibleTagsState[primaryTag] === false) return false;
    }

    return true;
  });

  // Vault management handlers
  const handleCreateVault = (vaultName: string) => {
    const newVault: Vault = {
      id: simpleUUID(),
      name: vaultName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVaults(prev => [...prev, newVault]);
    setCurrentVaultId(newVault.id);
  };

  const handleRenameVault = (vaultId: string, newName: string) => {
    setVaults(prev =>
      prev.map(v =>
        v.id === vaultId
          ? { ...v, name: newName, updatedAt: new Date().toISOString() }
          : v
      )
    );
  };

  const handleDeleteVault = (vaultId: string) => {
    // Delete all nodes and tags from this vault
    setNodes(prev => prev.filter(n => n.vaultId !== vaultId));
    setTags(prev => prev.filter(t => t.vaultId !== vaultId));
    setVaults(prev => prev.filter(v => v.id !== vaultId));

    // Switch to another vault or create a new default one
    const remainingVaults = vaults.filter(v => v.id !== vaultId);
    if (remainingVaults.length > 0) {
      setCurrentVaultId(remainingVaults[0].id);
    } else {
      // Create a new default vault
      const defaultVault: Vault = {
        id: simpleUUID(),
        name: "Default",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVaults([defaultVault]);
      setCurrentVaultId(defaultVault.id);
    }
  };

  const handleSwitchVault = (vaultId: string) => {
    setCurrentVaultId(vaultId);
    setActiveTag(null); // Reset active tag when switching vaults
  };

  if (!nodesLoaded || !tagsLoaded || !vaultsLoaded || !currentVaultIdLoaded || !visibleTagsLoaded) {
    return <View style={tw`flex-1 bg-gray-900 justify-center items-center`}><Text style={tw`text-white`}>Loading...</Text></View>;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-900`}>
      <StatusBar barStyle="light-content" />
      <View style={tw`relative flex-1`}>
        <View style={tw`absolute top-6 left-4 z-10 flex-col items-start gap-2`}>
          {/* Menu Button */}
          <TouchableOpacity
            onPress={() => setIsSidebarOpen(true)}
            style={tw`bg-gray-800 p-2 rounded-lg border border-gray-700 shadow-lg w-10 h-10 items-center justify-center`}
          >
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 12h18M3 6h18M3 18h18" />
            </Svg>
          </TouchableOpacity>

          {/* Back to Overview Button */}
          {activeTag && (
            <TouchableOpacity
              onPress={() => setActiveTag(null)}
              style={tw`bg-gray-800 border border-indigo-900 px-3 py-1.5 rounded shadow-sm`}
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
          showDifficulty={showDifficulty}
          visibleTagsState={visibleTagsState}
          onToggleTagVisibility={handleToggleTagVisibility}
        />

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
          allTags={currentVaultTags}
          allNodes={currentVaultNodes}
          showDifficulty={showDifficulty}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          nodes={currentVaultNodes}
          tags={currentVaultTags}
          onNodeClick={(node) => {
            handleNodeClick(node);
            setIsSidebarOpen(false);
          }}
          onTagClick={handleTagClick}
          onDeleteTag={handleDeleteTag}
          onEditTag={handleEditTag}
          onToggleDifficulty={() => setShowDifficulty(!showDifficulty)}
          difficultyVisible={showDifficulty}
          onReset={handleReset}
          onExport={handleExport}
          onImport={handleImport}
          vaults={vaults}
          currentVaultId={currentVaultId}
          onSwitchVault={handleSwitchVault}
          onCreateVault={handleCreateVault}
          onRenameVault={handleRenameVault}
          onDeleteVault={handleDeleteVault}
        />
      </View>
    </SafeAreaView>
  );
}
