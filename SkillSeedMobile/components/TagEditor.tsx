import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, LayoutAnimation, Platform, UIManager, PanResponder, Animated } from 'react-native';
import tw from 'twrnc';
import { Tag } from '../types';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TagEditorProps {
    selectedTags: string[];
    allTags: Tag[];
    onTagsChange: (tags: string[]) => void;
}

export default function TagEditor({ selectedTags, allTags, onTagsChange }: TagEditorProps) {
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
    const [draggingTag, setDraggingTag] = useState<string | null>(null);

    // Refs for layout measurements
    const tagLayouts = useRef<{ [key: string]: { x: number, y: number, width: number, height: number } }>({});

    // Animated value for the dragging tag
    const pan = useRef(new Animated.ValueXY()).current;

    // Throttling swaps
    const lastSwapTime = useRef<number>(0);

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

    const handleAddTag = (tagName: string) => {
        if (tagName.trim() && !selectedTags.includes(tagName)) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onTagsChange([...selectedTags, tagName]);
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

    const handleInputChange = (text: string) => {
        // Check for space
        if (text.endsWith(' ')) {
            const tagToAdd = text.trim();
            if (tagToAdd) {
                // If the typed tag matches a suggestion exactly (case-insensitive), use the suggestion's casing/color
                const exactMatch = tagSuggestions.find(t => t.name.toLowerCase() === tagToAdd.toLowerCase());
                if (exactMatch) {
                    handleAddTag(exactMatch.name);
                } else {
                    handleAddTag(tagToAdd);
                }
            } else {
                setTagInput('');
            }
        } else {
            setTagInput(text);
        }
    };

    const handleRemoveTag = (tagName: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onTagsChange(selectedTags.filter(t => t !== tagName));
    };

    const createPanResponder = (tagName: string, index: number) => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (e, gestureState) => {
            return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: () => {
            setDraggingTag(tagName);
            pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (e, gestureState) => {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });

            const now = Date.now();
            if (now - lastSwapTime.current < 200) return;

            const currentLayout = tagLayouts.current[tagName];
            if (!currentLayout) return;

            const centerX = currentLayout.x + currentLayout.width / 2 + gestureState.dx;
            const centerY = currentLayout.y + currentLayout.height / 2 + gestureState.dy;

            let targetTag: string | null = null;

            for (const otherTag of selectedTags) {
                if (otherTag === tagName) continue;

                const layout = tagLayouts.current[otherTag];
                if (!layout) continue;

                if (
                    centerX >= layout.x &&
                    centerX <= layout.x + layout.width &&
                    centerY >= layout.y &&
                    centerY <= layout.y + layout.height
                ) {
                    targetTag = otherTag;
                    break;
                }
            }

            if (targetTag) {
                const fromIndex = selectedTags.indexOf(tagName);
                const toIndex = selectedTags.indexOf(targetTag);

                if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                    const newTags = [...selectedTags];
                    newTags.splice(fromIndex, 1);
                    newTags.splice(toIndex, 0, tagName);

                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    onTagsChange(newTags);
                    lastSwapTime.current = now;
                }
            }
        },
        onPanResponderRelease: () => {
            setDraggingTag(null);
            pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
            setDraggingTag(null);
            pan.setValue({ x: 0, y: 0 });
        }
    });

    return (
        <View
            style={tw`flex-row flex-wrap items-center gap-2 border border-gray-700 rounded-lg p-2 bg-gray-800`}
        >
            <Text style={tw`text-gray-500 text-sm ml-2`}>#</Text>
            {selectedTags.map((tagName, index) => {
                const tag = allTags.find(t => t.name === tagName);
                const isDragging = draggingTag === tagName;
                const panResponder = createPanResponder(tagName, index);

                return (
                    <Animated.View
                        key={tagName}
                        onLayout={(e) => {
                            tagLayouts.current[tagName] = e.nativeEvent.layout;
                        }}
                        style={[
                            tw`px-3 py-1 rounded-md flex-row items-center`,
                            {
                                backgroundColor: tag?.color || '#6366f1',
                                transform: isDragging ? pan.getTranslateTransform() : [],
                                zIndex: isDragging ? 100 : 1,
                                opacity: isDragging ? 0.8 : 1,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: isDragging ? 0.25 : 0,
                                shadowRadius: 3.84,
                                elevation: isDragging ? 5 : 0
                            }
                        ]}
                    >
                        <View {...panResponder.panHandlers}>
                            <Text style={tw`text-white text-sm font-medium mr-1`}>{tagName}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveTag(tagName)}>
                            <Text style={tw`text-white text-xs opacity-70`}>×</Text>
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}

            <View style={tw`flex-1 relative z-50`}>
                <TextInput
                    style={tw`text-white px-2 py-1 text-sm min-w-24`}
                    value={tagInput}
                    onChangeText={handleInputChange}
                    onSubmitEditing={handleTagInputSubmit}
                    onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Tab') {
                            handleTagInputSubmit();
                        }
                    }}
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
    );
}
