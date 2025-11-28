import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import tw from 'twrnc';
import { Node, Tag, Difficulty } from '../types';
import { isUnassigned } from '../utils';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TagEditModal from './TagEditModal';

// Icons
const CloseIcon = () => (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Line x1="18" y1="6" x2="6" y2="18" />
        <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
);

const SearchIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="11" cy="11" r="8" />
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
);

const ChevronRightIcon = ({ color = "#9ca3af" }: { color?: string }) => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="9 18 15 12 9 6" />
    </Svg>
);

const TrashIcon = ({ color = "currentColor" }: { color?: string }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="3 6 5 6 21 6" />
        <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
);

const PencilIcon = ({ color = "currentColor" }: { color?: string }) => (
    <Svg width="16" height="16" viewBox="0 0 20 20" fill={color}>
        <Path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </Svg>
);

const DownloadIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <Polyline points="7 10 12 15 17 10" />
        <Line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
);

const UploadIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <Polyline points="17 8 12 3 7 8" />
        <Line x1="12" y1="3" x2="12" y2="15" />
    </Svg>
);

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    tags: Tag[];
    onNodeClick: (node: Node) => void;
    onTagClick: (tagName: string | 'UNASSIGNED') => void;
    onDeleteTag: (tagName: string) => void;
    onEditTag: (oldTagName: string, newTagName: string, newColor: string) => void;
    onToggleDifficulty: () => void;
    difficultyVisible: boolean;
    onReset: () => void;
    onExport: () => void;
    onImport: () => void;
}

type SortOption = 'Name (A-Z)' | 'Name (Z-A)' | 'Newest First' | 'Oldest First' | 'Difficulty (Easy→Hard)' | 'Difficulty (Hard→Easy)';

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    nodes,
    tags,
    onNodeClick,
    onTagClick,
    onDeleteTag,
    onEditTag,
    onToggleDifficulty,
    difficultyVisible,
    onReset,
    onExport,
    onImport
}) => {
    const [activeTab, setActiveTab] = useState<'Notes' | 'Settings'>('Notes');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('Name (A-Z)');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(tags.map(t => t.name)));
    const [editingTag, setEditingTag] = useState<Tag | null>(null);

    const { height } = Dimensions.get('window');
    const slideAnim = useRef(new Animated.Value(-320)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Load expanded tags from storage on mount
    useEffect(() => {
        const loadExpandedTags = async () => {
            try {
                const stored = await AsyncStorage.getItem('sidebar-expanded-tags');
                if (stored) {
                    setExpandedTags(new Set(JSON.parse(stored)));
                }
            } catch (error) {
                console.error('Failed to load expanded tags:', error);
            }
        };
        loadExpandedTags();
    }, []);

    // Save expanded tags to storage whenever they change
    useEffect(() => {
        const saveExpandedTags = async () => {
            try {
                await AsyncStorage.setItem('sidebar-expanded-tags', JSON.stringify(Array.from(expandedTags)));
            } catch (error) {
                console.error('Failed to save expanded tags:', error);
            }
        };
        saveExpandedTags();
    }, [expandedTags]);

    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -320,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [isOpen, slideAnim, fadeAnim]);

    const toggleTag = (tagName: string) => {
        const newExpanded = new Set(expandedTags);
        if (newExpanded.has(tagName)) {
            newExpanded.delete(tagName);
        } else {
            newExpanded.add(tagName);
        }
        setExpandedTags(newExpanded);
    };

    const filteredAndSortedNodes = useMemo(() => {
        let result = nodes.filter(node =>
            node.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        switch (sortBy) {
            case 'Name (A-Z)':
                result.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'Name (Z-A)':
                result.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'Newest First':
                result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'Oldest First':
                result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'Difficulty (Easy→Hard)':
                const diffOrder = { [Difficulty.Easy]: 1, [Difficulty.Medium]: 2, [Difficulty.Hard]: 3 };
                result.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
                break;
            case 'Difficulty (Hard→Easy)':
                const diffOrderRev = { [Difficulty.Easy]: 1, [Difficulty.Medium]: 2, [Difficulty.Hard]: 3 };
                result.sort((a, b) => diffOrderRev[b.difficulty] - diffOrderRev[a.difficulty]);
                break;
        }

        return result;
    }, [nodes, searchQuery, sortBy]);

    const groupedNodes = useMemo(() => {
        const groups: { [key: string]: Node[] } = {};
        tags.forEach(tag => groups[tag.name] = []);
        groups['UNASSIGNED'] = []; // Add unassigned group

        filteredAndSortedNodes.forEach(node => {
            if (isUnassigned(node)) {
                groups['UNASSIGNED'].push(node);
            } else {
                // Add node to ALL its tags
                node.tags.forEach(tagName => {
                    if (groups[tagName]) {
                        groups[tagName].push(node);
                    }
                });
            }
        });
        return groups;
    }, [filteredAndSortedNodes, tags]);

    return (
        <>
            {/* Overlay for outside click */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View
                    style={[
                        tw`absolute top-0 left-0 right-0 bottom-0 bg-black/50 z-40`,
                        { opacity: fadeAnim }
                    ]}
                    pointerEvents={isOpen ? 'auto' : 'none'}
                />
            </TouchableWithoutFeedback>

            {/* Sidebar */}
            <Animated.View style={[tw`absolute top-0 left-0 bottom-0 w-80 bg-gray-900 z-50 shadow-2xl border-r border-gray-800`, { transform: [{ translateX: slideAnim }] }]}>
                {/* Header */}
                <View style={tw`flex-row items-center justify-between p-4 pt-6 border-b border-gray-800`}>
                    <Text style={tw`text-xl font-bold text-white`}>Menu</Text>
                </View>

                {/* Tabs */}
                <View style={tw`flex-row border-b border-gray-800`}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('Notes')}
                        style={[tw`flex-1 py-3 items-center`, activeTab === 'Notes' && tw`border-b-2 border-indigo-500`]}
                    >
                        <Text style={[tw`font-medium`, activeTab === 'Notes' ? tw`text-white` : tw`text-gray-500`]}>Notes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('Settings')}
                        style={[tw`flex-1 py-3 items-center`, activeTab === 'Settings' && tw`border-b-2 border-indigo-500`]}
                    >
                        <Text style={[tw`font-medium`, activeTab === 'Settings' ? tw`text-white` : tw`text-gray-500`]}>Settings</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={tw`flex-1`}>
                    {activeTab === 'Notes' ? (
                        <View style={tw`flex-1`}>
                            {/* Search & Filter */}
                            <View style={tw`p-4 gap-3 border-b border-gray-800`}>
                                <View style={tw`flex-row items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700`}>
                                    <Text style={tw`text-gray-500 mr-2`}><SearchIcon /></Text>
                                    <TextInput
                                        style={tw`flex-1 text-white text-sm`}
                                        placeholder="Search notes..."
                                        placeholderTextColor="#6b7280"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                <View style={tw`flex-row items-center gap-2`}>
                                    <Text style={tw`text-gray-500 text-xs font-bold uppercase tracking-wider`}>Sort By</Text>
                                    <View style={tw`flex-1 relative z-20`}>
                                        <TouchableOpacity
                                            onPress={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                            style={tw`flex-row items-center justify-between bg-gray-800 rounded-lg px-3 py-2 border border-gray-700`}
                                        >
                                            <Text style={tw`text-gray-300 text-xs`}>{sortBy}</Text>
                                            <Text style={tw`text-gray-500`}><ChevronRightIcon /></Text>
                                        </TouchableOpacity>
                                        {isSortDropdownOpen && (
                                            <View style={tw`absolute top-10 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden`}>
                                                {[
                                                    'Name (A-Z)', 'Name (Z-A)',
                                                    'Newest First', 'Oldest First',
                                                    'Difficulty (Easy→Hard)', 'Difficulty (Hard→Easy)'
                                                ].map((option) => (
                                                    <TouchableOpacity
                                                        key={option}
                                                        onPress={() => {
                                                            setSortBy(option as SortOption);
                                                            setIsSortDropdownOpen(false);
                                                        }}
                                                        style={tw`px-3 py-2 border-b border-gray-700 active:bg-gray-700`}
                                                    >
                                                        <Text style={[tw`text-xs`, sortBy === option ? tw`text-indigo-400 font-bold` : tw`text-gray-300`]}>
                                                            {option}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* List */}
                            <ScrollView style={tw`flex-1`}>
                                {tags.map(tag => {
                                    const tagNodes = groupedNodes[tag.name] || [];
                                    if (tagNodes.length === 0) return null;

                                    const isExpanded = expandedTags.has(tag.name);

                                    return (
                                        <View key={tag.name} style={tw`border-b border-gray-800`}>
                                            <TouchableOpacity
                                                onPress={() => toggleTag(tag.name)}
                                                style={tw`flex-row items-center justify-between p-4 bg-gray-900 active:bg-gray-800`}
                                            >
                                                <View style={tw`flex-row items-center flex-1`}>
                                                    <View style={[tw`w-3 h-3 rounded-full mr-3`, { backgroundColor: tag.color }]} />
                                                    <Text style={tw`text-white font-bold text-sm`}>{tag.name}</Text>
                                                    <View style={tw`ml-2 bg-gray-800 px-2 py-0.5 rounded-full`}>
                                                        <Text style={tw`text-gray-400 text-xs`}>{tagNodes.length}</Text>
                                                    </View>
                                                </View>
                                                <View style={tw`flex-row items-center gap-2`}>
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTag(tag);
                                                        }}
                                                        style={tw`p-1`}
                                                    >
                                                        <PencilIcon color="#9ca3af" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteTag(tag.name);
                                                        }}
                                                        style={tw`p-1`}
                                                    >
                                                        <TrashIcon color="#9ca3af" />
                                                    </TouchableOpacity>
                                                    <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                                                        <ChevronRightIcon color="#9ca3af" />
                                                    </View>
                                                </View>
                                            </TouchableOpacity>

                                            {isExpanded && (
                                                <View style={tw`bg-gray-900/50`}>
                                                    {tagNodes.map(node => (
                                                        <TouchableOpacity
                                                            key={node.id}
                                                            onPress={() => {
                                                                onNodeClick(node);
                                                                onClose();
                                                            }}
                                                            style={tw`pl-10 pr-4 py-3 border-t border-gray-800/50 active:bg-gray-800`}
                                                        >
                                                            <Text style={tw`text-gray-300 text-sm`}>{node.title}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}

                                {/* Unassigned Category */}
                                {(() => {
                                    const unassignedNodes = groupedNodes['UNASSIGNED'] || [];
                                    const isExpanded = expandedTags.has('UNASSIGNED');

                                    return (
                                        <View key="UNASSIGNED" style={tw`border-b border-gray-800`}>
                                            <TouchableOpacity
                                                onPress={() => toggleTag('UNASSIGNED')}
                                                style={tw`flex-row items-center justify-between p-4 bg-gray-900 active:bg-gray-800`}
                                            >
                                                <View style={tw`flex-row items-center flex-1`}>
                                                    <View style={[tw`w-3 h-3 rounded-full mr-3`, { backgroundColor: '#94a3b8' }]} />
                                                    <Text style={tw`text-gray-400 font-bold text-sm italic`}>Unassigned</Text>
                                                    <View style={tw`ml-2 bg-gray-800 px-2 py-0.5 rounded-full`}>
                                                        <Text style={tw`text-gray-400 text-xs`}>{unassignedNodes.length}</Text>
                                                    </View>
                                                </View>
                                                <View style={tw`flex-row items-center gap-2`}>
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            onTagClick('UNASSIGNED');
                                                            onClose();
                                                        }}
                                                        style={tw`px-2 py-1 bg-gray-800 rounded`}
                                                    >
                                                        <Text style={tw`text-gray-400 text-xs`}>View</Text>
                                                    </TouchableOpacity>
                                                    <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                                                        <ChevronRightIcon color="#9ca3af" />
                                                    </View>
                                                </View>
                                            </TouchableOpacity>

                                            {isExpanded && (
                                                <View style={tw`bg-gray-900/50`}>
                                                    {unassignedNodes.map(node => (
                                                        <TouchableOpacity
                                                            key={node.id}
                                                            onPress={() => {
                                                                onNodeClick(node);
                                                                onClose();
                                                            }}
                                                            style={tw`pl-10 pr-4 py-3 border-t border-gray-800/50 active:bg-gray-800`}
                                                        >
                                                            <Text style={tw`text-gray-300 text-sm`}>{node.title}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()}
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={tw`flex-1 p-4`}>
                            <Text style={tw`text-gray-500 text-xs font-bold mb-4 uppercase tracking-wider`}>Visuals</Text>
                            <View style={tw`flex-row items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8`}>
                                <Text style={tw`text-white font-bold`}>Toggle Difficulty</Text>
                                <Switch
                                    value={difficultyVisible}
                                    onValueChange={onToggleDifficulty}
                                    trackColor={{ false: "#374151", true: "#6366f1" }}
                                    thumbColor={difficultyVisible ? "#ffffff" : "#9ca3af"}
                                />
                            </View>

                            <Text style={tw`text-gray-500 text-xs font-bold mb-4 uppercase tracking-wider`}>Data Management</Text>
                            <View style={tw`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-8`}>
                                <TouchableOpacity
                                    onPress={onExport}
                                    style={tw`flex-row items-center p-4 border-b border-gray-700 active:bg-gray-700`}
                                >
                                    <Text style={tw`text-indigo-400 mr-4`}><DownloadIcon /></Text>
                                    <View>
                                        <Text style={tw`text-white font-bold`}>Export Data</Text>
                                        <Text style={tw`text-gray-400 text-xs`}>Download graph as JSON</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onImport}
                                    style={tw`flex-row items-center p-4 active:bg-gray-700`}
                                >
                                    <Text style={tw`text-indigo-400 mr-4`}><UploadIcon /></Text>
                                    <View>
                                        <Text style={tw`text-white font-bold`}>Import Data</Text>
                                        <Text style={tw`text-gray-400 text-xs`}>Restore from JSON file</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={onReset}
                                style={tw`flex-row items-center bg-red-900/20 p-4 rounded-lg border border-red-900/50 active:bg-red-900/30`}
                            >
                                <Text style={tw`text-red-400 mr-4`}><TrashIcon /></Text>
                                <View>
                                    <Text style={tw`text-red-400 font-bold`}>Reset Everything</Text>
                                    <Text style={tw`text-red-400/70 text-xs`}>Clear all local data</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>

            <TagEditModal
                isOpen={!!editingTag}
                onClose={() => setEditingTag(null)}
                onSave={onEditTag}
                tagToEdit={editingTag}
                allTags={tags}
            />
        </>
    );
};

export default Sidebar;
