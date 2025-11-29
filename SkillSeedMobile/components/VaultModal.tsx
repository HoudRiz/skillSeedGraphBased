import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import tw from 'twrnc';

interface VaultModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    mode: 'create' | 'rename';
    initialName?: string;
    existingVaultNames: string[];
}

export default function VaultModal({
    isOpen,
    onClose,
    onSave,
    mode,
    initialName = '',
    existingVaultNames,
}: VaultModalProps) {
    const [vaultName, setVaultName] = useState(initialName);
    const [error, setError] = useState('');

    const handleSave = () => {
        const trimmedName = vaultName.trim();

        // Validation
        if (!trimmedName) {
            setError('Vault name cannot be empty');
            return;
        }

        // Check for duplicate names (case-insensitive)
        const isDuplicate = existingVaultNames.some(
            name => name.toLowerCase() === trimmedName.toLowerCase() && name !== initialName
        );

        if (isDuplicate) {
            setError('A vault with this name already exists');
            return;
        }

        onSave(trimmedName);
        setVaultName('');
        setError('');
        onClose();
    };

    const handleClose = () => {
        setVaultName(initialName);
        setError('');
        onClose();
    };

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={tw`flex-1 bg-black/70 justify-center items-center p-4`}>
                <View style={tw`bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700`}>
                    <Text style={tw`text-xl font-bold text-white mb-4`}>
                        {mode === 'create' ? 'Create New Vault' : 'Rename Vault'}
                    </Text>

                    <Text style={tw`text-sm text-gray-400 mb-2`}>Vault Name</Text>
                    <TextInput
                        style={tw`bg-gray-900 text-white px-4 py-3 rounded-lg border ${error ? 'border-red-500' : 'border-gray-700'
                            } mb-2`}
                        value={vaultName}
                        onChangeText={(text) => {
                            setVaultName(text);
                            setError('');
                        }}
                        placeholder="e.g., Programming, University, Personal"
                        placeholderTextColor="#6b7280"
                        autoFocus
                        onSubmitEditing={handleSave}
                    />

                    {error && (
                        <Text style={tw`text-red-400 text-sm mb-4`}>{error}</Text>
                    )}

                    <View style={tw`flex-row gap-3 mt-4`}>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={tw`flex-1 bg-gray-700 py-3 rounded-lg`}
                        >
                            <Text style={tw`text-white text-center font-semibold`}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={tw`flex-1 bg-indigo-600 py-3 rounded-lg`}
                        >
                            <Text style={tw`text-white text-center font-semibold`}>
                                {mode === 'create' ? 'Create' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
