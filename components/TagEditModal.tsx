import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import tw from 'twrnc';
import { Tag } from '../types';
import { TAG_COLORS } from '../constants';

interface TagEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (oldTagName: string, newTagName: string, newColor: string) => void;
    tagToEdit: Tag | null;
    allTags: Tag[];
}

const TagEditModal: React.FC<TagEditModalProps> = ({ isOpen, onClose, onSave, tagToEdit, allTags }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [customColor, setCustomColor] = useState('');
    const [isCustomColorMode, setIsCustomColorMode] = useState(false);

    useEffect(() => {
        if (tagToEdit) {
            setName(tagToEdit.name);
            setColor(tagToEdit.color);
            // Check if color is in presets
            if (!TAG_COLORS.includes(tagToEdit.color)) {
                setIsCustomColorMode(true);
                setCustomColor(tagToEdit.color);
            } else {
                setIsCustomColorMode(false);
                setCustomColor('');
            }
        } else {
            setName('');
            setColor(TAG_COLORS[0]);
            setIsCustomColorMode(false);
            setCustomColor('');
        }
    }, [tagToEdit, isOpen]);


    const handleSave = () => {
        if (!tagToEdit) return;

        const trimmedName = name.trim();
        if (!trimmedName) {
            Alert.alert("Validation Error", "Tag name cannot be empty.");
            return;
        }

        // Check for duplicates (case-insensitive)
        const isDuplicate = allTags.some(t =>
            t.name.toLowerCase() === trimmedName.toLowerCase() &&
            t.name !== tagToEdit.name // Exclude current tag
        );

        if (isDuplicate) {
            Alert.alert("Validation Error", "A tag with this name already exists.");
            return;
        }

        const finalColor = isCustomColorMode ? customColor : color;

        // Basic hex validation
        if (isCustomColorMode && !/^#([0-9A-F]{3}){1,2}$/i.test(finalColor)) {
            Alert.alert("Validation Error", "Invalid hex color format (e.g., #FF0000).");
            return;
        }

        onSave(tagToEdit.name, trimmedName, finalColor);
        onClose();
    };

    return (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1 justify-center items-center bg-black/70`}
            >
                <View style={tw`bg-gray-900 w-11/12 max-w-md rounded-xl border border-gray-700 shadow-2xl overflow-hidden`}>
                    <View style={tw`p-4 border-b border-gray-800 flex-row justify-between items-center`}>
                        <Text style={tw`text-white font-bold text-lg`}>Edit Tag</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={tw`text-gray-400 text-lg`}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={tw`p-4 max-h-96`}>
                        {/* Name Input */}
                        <View style={tw`mb-6`}>
                            <Text style={tw`text-gray-400 text-xs font-bold uppercase mb-2`}>Tag Name</Text>
                            <TextInput
                                style={tw`bg-gray-800 text-white p-3 rounded-lg border border-gray-700`}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter tag name"
                                placeholderTextColor="#6b7280"
                            />
                        </View>

                        {/* Color Picker */}
                        <View style={tw`mb-6`}>
                            <Text style={tw`text-gray-400 text-xs font-bold uppercase mb-2`}>Color</Text>

                            <View style={tw`flex-row flex-wrap gap-3 mb-4`}>
                                {TAG_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => {
                                            setColor(c);
                                            setIsCustomColorMode(false);
                                        }}
                                        style={[
                                            tw`w-8 h-8 rounded-full border-2`,
                                            { backgroundColor: c },
                                            color === c && !isCustomColorMode ? tw`border-white` : tw`border-transparent`
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={() => setIsCustomColorMode(!isCustomColorMode)}
                                style={tw`flex-row items-center mb-2`}
                            >
                                <View style={[
                                    tw`w-4 h-4 rounded-full border border-gray-500 mr-2`,
                                    isCustomColorMode ? tw`bg-indigo-500 border-indigo-500` : tw`bg-transparent`
                                ]} />
                                <Text style={tw`text-gray-300 text-sm`}>Use Custom Color</Text>
                            </TouchableOpacity>

                            {isCustomColorMode && (
                                <View style={tw`flex-row items-center gap-2`}>
                                    <View style={[tw`w-8 h-8 rounded-lg border border-gray-700`, { backgroundColor: customColor || '#000000' }]} />
                                    <TextInput
                                        style={tw`flex-1 bg-gray-800 text-white p-3 rounded-lg border border-gray-700`}
                                        value={customColor}
                                        onChangeText={setCustomColor}
                                        placeholder="#000000"
                                        placeholderTextColor="#6b7280"
                                        autoCapitalize="characters"
                                    />
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    <View style={tw`p-4 border-t border-gray-800 flex-row justify-end gap-3 bg-gray-900`}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={tw`px-4 py-2 rounded-lg`}
                        >
                            <Text style={tw`text-gray-400 font-medium`}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={tw`bg-indigo-600 px-6 py-2 rounded-lg shadow-lg shadow-indigo-500/20`}
                        >
                            <Text style={tw`text-white font-bold`}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default TagEditModal;
