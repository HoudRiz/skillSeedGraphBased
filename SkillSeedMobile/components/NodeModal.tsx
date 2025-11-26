
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Svg, { Path } from 'react-native-svg';
import tw from 'twrnc';
import { Node, Tag, NodeFormData, Difficulty } from '../types';
import { DIFFICULTY_LEVELS } from '../constants';

interface NodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NodeFormData, id?: string) => void;
    onDelete: (id: string) => void;
    nodeToEdit: Node | null;
    allTags: Tag[];
    allNodes: Node[];
}

const PencilIcon = ({ color = "currentColor" }: { color?: string }) => (
    <Svg width="16" height="16" viewBox="0 0 20 20" fill={color}>
        <Path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </Svg>
);

const EyeIcon = ({ color = "currentColor" }: { color?: string }) => (
    <Svg width="16" height="16" viewBox="0 0 20 20" fill={color}>
        <Path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <Path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </Svg>
);

const NodeModal: React.FC<NodeModalProps> = ({ isOpen, onClose, onSave, onDelete, nodeToEdit, allTags, allNodes }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Easy);
    const [isPreview, setIsPreview] = useState(false);
    const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);

    const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
    const [linkSuggestions, setLinkSuggestions] = useState<Node[]>([]);
    const [linkSearchQuery, setLinkSearchQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);

    useEffect(() => {
        if (nodeToEdit) {
            setTitle(nodeToEdit.title);
            setDescription(nodeToEdit.description || '');
            setSelectedTags(nodeToEdit.tags);
            setDifficulty(nodeToEdit.difficulty);
        } else {
            setTitle('');
            setDescription('');
            setSelectedTags([]);
            setDifficulty(Difficulty.Easy);
        }
        setIsPreview(false);
        setTagInput('');
        setShowTagSuggestions(false);
        setShowLinkSuggestions(false);
    }, [nodeToEdit, isOpen]);

    useEffect(() => {
        if (tagInput.trim()) {
            const filtered = allTags.filter(tag =>
                tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
                !selectedTags.includes(tag.name)
            );
            setTagSuggestions(filtered);
            setShowTagSuggestions(filtered.length > 0);
        } else {
            setShowTagSuggestions(false);
        }
    }, [tagInput, allTags, selectedTags]);

    useEffect(() => {
        const lastTwoChars = description.slice(Math.max(0, cursorPosition - 2), cursorPosition);

        if (lastTwoChars === '[[') {
            setShowLinkSuggestions(true);
            setLinkSearchQuery('');
            setLinkSuggestions(allNodes);
        } else if (showLinkSuggestions) {
            const beforeCursor = description.slice(0, cursorPosition);
            const match = beforeCursor.match(/\[\[([^\]]*?)$/);

            if (match) {
                const query = match[1];
                setLinkSearchQuery(query);
                const filtered = allNodes.filter(node =>
                    node.title.toLowerCase().includes(query.toLowerCase())
                );
                setLinkSuggestions(filtered);
            } else {
                setShowLinkSuggestions(false);
            }
        }
    }, [description, cursorPosition, allNodes, showLinkSuggestions]);

    const handleAddTag = (tagName: string) => {
        if (tagName.trim() && !selectedTags.includes(tagName)) {
            setSelectedTags([...selectedTags, tagName]);
        }
        setTagInput('');
        setShowTagSuggestions(false);
    };

    const handleTagInputSubmit = () => {
        if (tagInput.trim()) {
            if (tagSuggestions.length > 0) {
                handleAddTag(tagSuggestions[0].name);
            } else {
                handleAddTag(tagInput.trim());
            }
        }
    };

    const handleRemoveTag = (tagName: string) => {
        setSelectedTags(selectedTags.filter(t => t !== tagName));
    };

    const handleSelectLink = (node: Node) => {
        const beforeCursor = description.slice(0, cursorPosition);
        const afterCursor = description.slice(cursorPosition);

        const match = beforeCursor.match(/\[\[([^\]]*?)$/);
        if (match) {
            const startPos = beforeCursor.lastIndexOf('[[');
            const newDescription = description.slice(0, startPos) + `[[${node.title}]]` + afterCursor;
            setDescription(newDescription);
            setCursorPosition(startPos + `[[${node.title}]]`.length);
        }

        setShowLinkSuggestions(false);
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert("Error", "Title is required");
            return;
        }
        if (selectedTags.length === 0) {
            Alert.alert("Error", "At least one tag is required");
            return;
        }
        onSave({
            title,
            description,
            tags: selectedTags,
            difficulty
        }, nodeToEdit?.id);
    };

    return (
        <Modal visible={isOpen} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}
            >
                <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
                    <View style={tw`bg-gray-900 rounded-t-3xl h-[90%]`}>
                        <View style={tw`p-4 border-b border-gray-700`}>
                            <TextInput
                                style={tw`text-2xl font-bold text-white`}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Untitled"
                                placeholderTextColor="#6b7280"
                            />
                        </View>

                        <View style={tw`px-4 py-3 border-b border-gray-700 flex-row items-center justify-between`}>
                            <View style={tw`flex-1 flex-row items-center`}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row mr-2`}>
                                    {selectedTags.map(tagName => {
                                        const tag = allTags.find(t => t.name === tagName);
                                        return (
                                            <TouchableOpacity
                                                key={tagName}
                                                onPress={() => handleRemoveTag(tagName)}
                                                style={[tw`px-3 py-1 rounded-full mr-2 flex-row items-center`, { backgroundColor: tag?.color || '#6366f1' }]}
                                            >
                                                <Text style={tw`text-white text-xs font-bold mr-1`}>{tagName}</Text>
                                                <Text style={tw`text-white text-xs`}>×</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                <View style={tw`relative`}>
                                    <TextInput
                                        style={tw`bg-gray-800 text-white px-3 py-1 rounded-full text-xs min-w-24`}
                                        value={tagInput}
                                        onChangeText={setTagInput}
                                        onSubmitEditing={handleTagInputSubmit}
                                        placeholder="# Add tags..."
                                        placeholderTextColor="#6b7280"
                                        returnKeyType="done"
                                    />

                                    {showTagSuggestions && (
                                        <View style={tw`absolute top-8 left-0 bg-gray-800 rounded-lg shadow-lg z-50 w-48`}>
                                            {tagSuggestions.map(tag => (
                                                <TouchableOpacity
                                                    key={tag.name}
                                                    onPress={() => handleAddTag(tag.name)}
                                                    style={tw`px-4 py-2 border-b border-gray-700`}
                                                >
                                                    <Text style={tw`text-white text-sm`}>{tag.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={tw`relative ml-2`}>
                                <TouchableOpacity
                                    onPress={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                                    style={tw`flex-row bg-gray-800 rounded-lg items-center px-2 py-1`}
                                >
                                    <Text style={tw`text-gray-400 text-xs mr-1`}>DIFF:</Text>
                                    <Text style={tw`text-white text-xs mr-1`}>{difficulty}</Text>
                                    <Text style={tw`text-gray-400 text-xs`}>▼</Text>
                                </TouchableOpacity>

                                {showDifficultyDropdown && (
                                    <View style={tw`absolute top-8 right-0 bg-gray-800 rounded-lg shadow-lg z-50 w-32`}>
                                        {DIFFICULTY_LEVELS.map(diff => (
                                            <TouchableOpacity
                                                key={diff}
                                                onPress={() => {
                                                    setDifficulty(diff);
                                                    setShowDifficultyDropdown(false);
                                                }}
                                                style={[tw`px-4 py-2 border-b border-gray-700`, difficulty === diff && tw`bg-gray-700`]}
                                            >
                                                <Text style={[tw`text-sm`, difficulty === diff ? tw`text-white font-bold` : tw`text-gray-300`]}>{diff}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={tw`flex-row bg-gray-800 p-1 rounded-lg ml-2 border border-gray-700`}>
                                <TouchableOpacity
                                    onPress={() => setIsPreview(false)}
                                    style={[tw`p-1.5 rounded`, !isPreview && tw`bg-indigo-600 shadow-sm`]}
                                >
                                    <PencilIcon color={!isPreview ? "#ffffff" : "#9ca3af"} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setIsPreview(true)}
                                    style={[tw`p-1.5 rounded`, isPreview && tw`bg-indigo-600 shadow-sm`]}
                                >
                                    <EyeIcon color={isPreview ? "#ffffff" : "#9ca3af"} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={tw`flex-1 px-4 py-4`}>
                            {isPreview ? (
                                <Markdown style={{
                                    body: { color: '#e5e7eb' },
                                    heading1: { color: '#ffffff' },
                                    heading2: { color: '#ffffff' },
                                    link: { color: '#6366f1' },
                                    code_inline: { backgroundColor: '#374151', color: '#e5e7eb' },
                                    code_block: { backgroundColor: '#1f2937', color: '#e5e7eb' },
                                }}>
                                    {description || '_Start typing... Use [[ to link to other skills._'}
                                </Markdown>
                            ) : (
                                <View>
                                    <TextInput
                                        style={tw`bg-gray-800 text-white p-3 rounded-lg min-h-64 text-base`}
                                        value={description}
                                        onChangeText={setDescription}
                                        onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                                        placeholder="Start typing... Use [[ to link to other skills."
                                        placeholderTextColor="#6b7280"
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    {showLinkSuggestions && linkSuggestions.length > 0 && (
                                        <View style={tw`mt-2 bg-gray-800 rounded-lg shadow-lg max-h-48`}>
                                            <Text style={tw`text-gray-400 text-xs px-3 py-2 border-b border-gray-700`}>Link to:</Text>
                                            <FlatList
                                                data={linkSuggestions.slice(0, 5)}
                                                keyExtractor={(item) => item.id}
                                                renderItem={({ item }) => (
                                                    <TouchableOpacity
                                                        onPress={() => handleSelectLink(item)}
                                                        style={tw`px-3 py-2 border-b border-gray-700`}
                                                    >
                                                        <Text style={tw`text-white text-sm`}>{item.title}</Text>
                                                        <Text style={tw`text-gray-500 text-xs`}>{item.tags[0]} / {item.difficulty}</Text>
                                                    </TouchableOpacity>
                                                )}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <View style={tw`p-4 border-t border-gray-700 flex-row justify-between`}>
                            {nodeToEdit && (
                                <TouchableOpacity
                                    onPress={() => onDelete(nodeToEdit.id)}
                                    style={tw`px-4 py-2`}
                                >
                                    <Text style={tw`text-red-400 font-bold`}>Delete File</Text>
                                </TouchableOpacity>
                            )}

                            <View style={tw`flex-row ml-auto`}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={tw`px-4 py-2 mr-2`}
                                >
                                    <Text style={tw`text-gray-400`}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSave}
                                    style={tw`bg-indigo-600 px-6 py-2 rounded-lg`}
                                >
                                    <Text style={tw`text-white font-bold`}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default NodeModal;
