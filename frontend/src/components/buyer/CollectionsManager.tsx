'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, Edit2, Trash2, X, Check, FolderOpen, Grid3x3 } from 'lucide-react';

import { Collection } from '@/lib/propertiesApi';

interface CollectionsManagerProps {
    collections: Collection[];
    activeCollection: string | null;
    onSelectCollection: (collectionId: string | null) => void;
    onCreateCollection: (name: string, color: string) => void;
    onUpdateCollection: (id: string, name: string, color: string) => void;
    onDeleteCollection: (id: string) => void;
}

const COLLECTION_COLORS = [
    { name: 'Rose', value: 'rose', gradient: 'from-rose-500 to-pink-600' },
    { name: 'Blue', value: 'blue', gradient: 'from-blue-500 to-indigo-600' },
    { name: 'Emerald', value: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
    { name: 'Amber', value: 'amber', gradient: 'from-amber-500 to-orange-600' },
    { name: 'Purple', value: 'purple', gradient: 'from-purple-500 to-indigo-600' },
    { name: 'Cyan', value: 'cyan', gradient: 'from-cyan-500 to-blue-600' }
];

export default function CollectionsManager({
    collections,
    activeCollection,
    onSelectCollection,
    onCreateCollection,
    onUpdateCollection,
    onDeleteCollection
}: CollectionsManagerProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLLECTION_COLORS[0].value);

    const handleCreate = () => {
        if (newName.trim()) {
            onCreateCollection(newName.trim(), selectedColor);
            setNewName('');
            setSelectedColor(COLLECTION_COLORS[0].value);
            setIsCreating(false);
        }
    };

    const handleUpdate = (id: string) => {
        if (newName.trim()) {
            onUpdateCollection(id, newName.trim(), selectedColor);
            setEditingId(null);
            setNewName('');
        }
    };

    const startEdit = (collection: Collection) => {
        setEditingId(collection.id);
        setNewName(collection.name);
        setSelectedColor(collection.color);
    };

    return (
        <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-rose-500" />
                    Collections
                </h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New Collection
                </button>
            </div>

            {/* All Properties Option */}
            <button
                onClick={() => onSelectCollection(null)}
                className={`w-full flex items-center justify-between p-4 rounded-xl mb-3 transition-all ${activeCollection === null
                    ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-500'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                        <Grid3x3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-gray-900">All Properties</p>
                        <p className="text-sm text-gray-500">
                            {collections.reduce((sum, c) => sum + c.property_count, 0)} properties
                        </p>
                    </div>
                </div>
            </button>

            {/* Collections List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {collections.map((collection) => {
                        const colorData = COLLECTION_COLORS.find(c => c.value === collection.color) || COLLECTION_COLORS[0];
                        const isEditing = editingId === collection.id;

                        return (
                            <motion.div
                                key={collection.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeCollection === collection.id
                                    ? `bg-gradient-to-r from-${collection.color}-50 to-${collection.color}-50 border-2 border-${collection.color}-500`
                                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                    }`}
                            >
                                {isEditing ? (
                                    <>
                                        <div className="flex-1 space-y-3">
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                                placeholder="Collection name"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                {COLLECTION_COLORS.map((color) => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => setSelectedColor(color.value)}
                                                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color.gradient} ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUpdate(collection.id)}
                                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(null);
                                                setNewName('');
                                            }}
                                            className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onSelectCollection(collection.id)}
                                            className="flex-1 flex items-center gap-3"
                                        >
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorData.gradient} flex items-center justify-center`}>
                                                <Folder className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-900">{collection.name}</p>
                                                <p className="text-sm text-gray-500">{collection.property_count} properties</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => startEdit(collection)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Delete collection "${collection.name}"?`)) {
                                                    onDeleteCollection(collection.id);
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Create New Collection Form */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                        <h3 className="font-semibold text-gray-900 mb-3">Create Collection</h3>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-3"
                            placeholder="Enter collection name"
                            autoFocus
                        />
                        <div className="flex gap-2 mb-4">
                            {COLLECTION_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color.gradient} ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                                        }`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewName('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
