import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import tw from 'twrnc';
import { Vault } from '../types';
import VaultModal from './VaultModal';

interface VaultSwitcherProps {
    vaults: Vault[];
    currentVaultId: string | null;
    onSwitchVault: (vaultId: string) => void;
    onCreateVault: (name: string) => void;
    onRenameVault: (vaultId: string, newName: string) => void;
    onDeleteVault: (vaultId: string) => void;
}

const ChevronDownIcon = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <Path d="M6 9l6 6 6-6" />
    </Svg>
);



const PlusIcon = () => (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
        <Path d="M12 5v14M5 12h14" />
    </Svg>
);

const EditIcon = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
        <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
);

const TrashIcon = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
        <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
);

const DownloadIcon = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </Svg>
);

const UploadIcon = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </Svg>
);

export default function VaultSwitcher({
    vaults,
    currentVaultId,
    onSwitchVault,
    onCreateVault,
    onRenameVault,
    onDeleteVault,
}: VaultSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'rename'>('create');
    const [vaultToRename, setVaultToRename] = useState<Vault | null>(null);

    const currentVault = vaults.find(v => v.id === currentVaultId);

    const handleVaultSelect = (vaultId: string) => {
        onSwitchVault(vaultId);
        setIsOpen(false);
    };

    const handleRename = (vault: Vault) => {
        setIsOpen(false);
        setVaultToRename(vault);
        setModalMode('rename');
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setIsOpen(false);
        setModalMode('create');
        setVaultToRename(null);
        setIsModalOpen(true);
    };

    const handleModalSave = (name: string) => {
        if (modalMode === 'create') {
            onCreateVault(name);
        } else if (modalMode === 'rename' && vaultToRename) {
            onRenameVault(vaultToRename.id, name);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (vault: Vault) => {
        setIsOpen(false);
        Alert.alert(
            'Delete Vault',
            `Are you sure you want to delete "${vault.name}"? All nodes and tags in this vault will be permanently deleted. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDeleteVault(vault.id),
                },
            ]
        );
    };

    return (
        <>
            {/* Vault Selector Button */}
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                style={tw`bg-gray-800 px-3 py-2 rounded-lg border border-gray-700 shadow-lg flex-row items-center gap-2 min-w-32`}
            >
                <Text style={tw`text-white text-sm font-medium flex-1`} numberOfLines={1}>
                    {currentVault?.name || 'Select Vault'}
                </Text>
                <ChevronDownIcon />
            </TouchableOpacity>

            {/* Vault Selector Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={tw`flex-1 bg-black/70`}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={tw`mt-20 ml-4 mr-4`}>
                        <TouchableOpacity activeOpacity={1}>
                            <View style={tw`bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden`}>
                                {/* Header */}
                                <View style={tw`bg-gray-900 px-4 py-3 border-b border-gray-700`}>
                                    <Text style={tw`text-white font-semibold text-base`}>Switch Vault</Text>
                                </View>

                                {/* Vault List */}
                                <ScrollView style={tw`max-h-80`}>
                                    {vaults.map((vault) => (
                                        <View key={vault.id}>
                                            <View style={tw`flex-row items-center px-4 py-3 ${vault.id === currentVaultId ? 'bg-indigo-900/30' : ''
                                                }`}>
                                                <TouchableOpacity
                                                    onPress={() => handleVaultSelect(vault.id)}
                                                    style={tw`flex-1 flex-row items-center gap-2`}
                                                >
                                                    <View style={tw`flex-1`}>
                                                        <Text style={tw`text-white font-medium`}>{vault.name}</Text>
                                                        {vault.id === currentVaultId && (
                                                            <Text style={tw`text-indigo-400 text-xs mt-0.5`}>Current</Text>
                                                        )}
                                                    </View>
                                                </TouchableOpacity>

                                                {/* Action Buttons */}
                                                <View style={tw`flex-row gap-2`}>
                                                    <TouchableOpacity
                                                        onPress={() => handleRename(vault)}
                                                        style={tw`p-2`}
                                                    >
                                                        <EditIcon />
                                                    </TouchableOpacity>

                                                    {vaults.length > 1 && (
                                                        <TouchableOpacity
                                                            onPress={() => handleDelete(vault)}
                                                            style={tw`p-2`}
                                                        >
                                                            <TrashIcon />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                            {vault.id !== vaults[vaults.length - 1].id && (
                                                <View style={tw`h-px bg-gray-700 mx-4`} />
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>

                                {/* Create New Vault Button */}
                                <TouchableOpacity
                                    onPress={handleCreate}
                                    style={tw`bg-gray-900 border-t border-gray-700 px-4 py-3 flex-row items-center gap-2`}
                                >
                                    <PlusIcon />
                                    <Text style={tw`text-indigo-400 font-semibold`}>Create New Vault</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Vault Modal for Create/Rename */}
            <VaultModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleModalSave}
                mode={modalMode}
                initialName={modalMode === 'rename' ? vaultToRename?.name : ''}
                existingVaultNames={vaults.map(v => v.name)}
            />
        </>
    );
}
