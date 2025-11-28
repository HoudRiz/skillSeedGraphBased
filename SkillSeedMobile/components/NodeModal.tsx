
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
    showDifficulty: boolean;
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

const NodeModal: React.FC<NodeModalProps> = ({ isOpen, onClose, onSave, onDelete, nodeToEdit, allTags, allNodes, showDifficulty }) => {
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

    // Auto-focus title for new notes
    const titleInputRef = React.useRef<TextInput>(null);
    useEffect(() => {
        if (isOpen && !nodeToEdit) {
            // Small timeout to ensure modal is visible
            setTimeout(() => {
                titleInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, nodeToEdit]);

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
        onSave({
            title,
            description,
            tags: selectedTags,
            difficulty
        }, nodeToEdit?.id);
    };

    return (
        <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1 bg-gray-900`}
            >
                <View style={tw`flex-1 bg-gray-900`}>
                    {/* Header: Title */}
                    <View style={tw`px-6 pt-6 pb-4`}>
                        <TextInput
                            ref={titleInputRef}
                            style={tw`text-3xl font-bold text-white`}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Untitled"
                            placeholderTextColor="#4b5563"
                            selectionColor="#818cf8"
                        />
                    </View>

                    {/* Toolbar */}
                    <View style={tw`px-6 pb-4 flex-col gap-4 border-b border-gray-800`}>
                        {/* Tags Row - Full Width Container */}
                        <View style={tw`flex-row flex-wrap items-center gap-2 border border-gray-700 rounded-lg p-2 bg-gray-800`}>
                            <Text style={tw`text-gray-500 text-sm ml-2`}>#</Text>
                            {selectedTags.map(tagName => {
                                const tag = allTags.find(t => t.name === tagName);
                                return (
                                    <TouchableOpacity
                                        key={tagName}
                                        onPress={() => handleRemoveTag(tagName)}
                                        style={[tw`px-3 py-1 rounded-md flex-row items-center`, { backgroundColor: tag?.color || '#6366f1' }]}
                                    >
                                        <Text style={tw`text-white text-sm font-medium mr-1`}>{tagName}</Text>
                                        <Text style={tw`text-white text-xs opacity-70`}>×</Text>
                                    </TouchableOpacity>
                                );
                            })}

                            <View style={tw`flex-1 relative z-50`}>
                                <TextInput
                                    style={tw`text-white px-2 py-1 text-sm min-w-24`}
                                    value={tagInput}
                                    onChangeText={setTagInput}
                                    onSubmitEditing={handleTagInputSubmit}
                                    placeholder={selectedTags.length === 0 ? "Add tags (optional)..." : ""}
                                    placeholderTextColor="#6b7280"
                                    returnKeyType="done"
                                />

                                {showTagSuggestions && (
                                    <View style={tw`absolute top-10 left-0 bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-48 overflow-hidden`}>
                                        {tagSuggestions.map(tag => (
                                            <TouchableOpacity
                                                key={tag.name}
                                                onPress={() => handleAddTag(tag.name)}
                                                style={tw`px-4 py-3 border-b border-gray-700 active:bg-gray-700`}
                                            >
                                                <Text style={tw`text-white text-sm`}>{tag.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Controls Row: Difficulty & View Toggle */}
                        <View style={tw`flex-row justify-between items-center gap-4`}>
                            <View style={tw`flex-1 relative z-40`}>
                                {showDifficulty && (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                                            style={tw`flex-row bg-gray-800 rounded-lg items-center justify-between px-4 py-3 border border-gray-700`}
                                        >
                                            <View style={tw`flex-row items-center`}>
                                                <Text style={tw`text-gray-400 text-sm mr-3 font-medium tracking-wide`}>DIFF:</Text>
                                                <Text style={[
                                                    tw`text-sm font-bold`,
                                                    difficulty === Difficulty.Easy ? tw`text-green-400` :
                                                        difficulty === Difficulty.Medium ? tw`text-yellow-400` :
                                                            tw`text-red-400`
                                                ]}>{difficulty}</Text>
                                            </View>
                                            <Text style={tw`text-gray-500 text-xs`}>▼</Text>
                                        </TouchableOpacity>

                                        {showDifficultyDropdown && (
                                            <View style={tw`absolute top-12 left-0 right-0 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden`}>
                                                {DIFFICULTY_LEVELS.map(diff => (
                                                    <TouchableOpacity
                                                        key={diff}
                                                        onPress={() => {
                                                            setDifficulty(diff);
                                                            setShowDifficultyDropdown(false);
                                                        }}
                                                        style={[tw`px-4 py-3 border-b border-gray-700`, difficulty === diff && tw`bg-gray-700`]}
                                                    >
                                                        <Text style={[tw`text-sm`, difficulty === diff ? tw`text-white font-bold` : tw`text-gray-300`]}>{diff}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>

                            <View style={tw`flex-row bg-gray-800 p-1 rounded-lg border border-gray-700`}>
                                <TouchableOpacity
                                    onPress={() => setIsPreview(false)}
                                    style={[tw`p-2.5 rounded-md`, !isPreview && tw`bg-gray-700`]}
                                >
                                    <PencilIcon color={!isPreview ? "#ffffff" : "#6b7280"} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setIsPreview(true)}
                                    style={[tw`p-2.5 rounded-md`, isPreview && tw`bg-gray-700`]}
                                >
                                    <EyeIcon color={isPreview ? "#ffffff" : "#6b7280"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Editor Area */}
                    <View style={tw`flex-1 px-6 py-4`}>
                        {isPreview ? (
                            <ScrollView style={tw`flex-1`}>
                                <Markdown style={{
                                    body: { color: '#e5e7eb', fontSize: 16, lineHeight: 24 },
                                    heading1: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
                                    heading2: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
                                    link: { color: '#818cf8' },
                                    code_inline: { backgroundColor: '#374151', color: '#e5e7eb', borderRadius: 4, paddingHorizontal: 4 },
                                    code_block: { backgroundColor: '#111827', color: '#e5e7eb', borderRadius: 8, padding: 12 },
                                }}>
                                    {description || '_Start typing... Use [[ to link to other skills._'}
                                </Markdown>
                            </ScrollView>
                        ) : (
                            <View style={tw`flex-1 relative`}>
                                <TextInput
                                    style={tw`flex-1 text-white text-base leading-6 text-gray-200`}
                                    value={description}
                                    onChangeText={setDescription}
                                    onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                                    placeholder="Start typing... Use [[ to link to other skills."
                                    placeholderTextColor="#4b5563"
                                    multiline
                                    textAlignVertical="top"
                                    selectionColor="#818cf8"
                                />

                                {showLinkSuggestions && linkSuggestions.length > 0 && (
                                    <View style={tw`absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-xl shadow-2xl border-t border-gray-700 max-h-64`}>
                                        <View style={tw`px-4 py-3 border-b border-gray-700 bg-gray-800 rounded-t-xl`}>
                                            <Text style={tw`text-gray-400 text-xs font-bold uppercase tracking-wider`}>Link to Note</Text>
                                        </View>
                                        <FlatList
                                            data={linkSuggestions}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    onPress={() => handleSelectLink(item)}
                                                    style={tw`px-4 py-3 border-b border-gray-700 active:bg-gray-700`}
                                                >
                                                    <Text style={tw`text-white text-sm font-medium`}>{item.title}</Text>
                                                    <View style={tw`flex-row items-center mt-1`}>
                                                        <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: allTags.find(t => t.name === item.tags[0])?.color || '#cbd5e1' }]} />
                                                        <Text style={tw`text-gray-500 text-xs`}>{item.tags[0]} • {item.difficulty}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={tw`px-6 py-4 border-t border-gray-800 flex-row justify-between items-center bg-gray-900`}>
                        {nodeToEdit ? (
                            <TouchableOpacity
                                onPress={() => onDelete(nodeToEdit.id)}
                                style={tw`p-2`}
                            >
                                <Text style={tw`text-red-400 text-sm font-medium`}>Delete</Text>
                            </TouchableOpacity>
                        ) : (
                            <View /> /* Spacer */
                        )}

                        <View style={tw`flex-row items-center gap-4`}>
                            <TouchableOpacity
                                onPress={onClose}
                                style={tw`px-4 py-2`}
                            >
                                <Text style={tw`text-gray-400 font-medium`}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSave}
                                style={tw`bg-indigo-600 px-6 py-2.5 rounded-full shadow-lg shadow-indigo-500/20`}
                            >
                                <Text style={tw`text-white font-bold tracking-wide`}>Save Note</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default NodeModal;
