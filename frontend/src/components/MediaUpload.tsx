'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Star, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import {
    uploadPropertyMedia,
    deletePropertyMedia,
    setMediaPrimary
} from '@/lib/api/seller';
import { PropertyMediaResponse } from '@/lib/types/property';

interface MediaUploadProps {
    propertyId: string;
    media: PropertyMediaResponse[];
    onMediaChange: () => void;  // Callback to refetch property
    disabled?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MediaUpload({ propertyId, media, onMediaChange, disabled = false }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        await uploadFiles(files);
    }, [disabled, propertyId]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        await uploadFiles(files);
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setError(null);
        setUploading(true);

        try {
            // Upload files sequentially to avoid overwhelming server
            for (const file of files) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    setError(`${file.name} is not an image file`);
                    continue;
                }

                // Validate file size (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    setError(`${file.name} is too large. Max size: 5MB`);
                    continue;
                }

                await uploadPropertyMedia(propertyId, file);
            }

            // Refetch property to get updated media list
            onMediaChange();
        } catch (err: any) {
            setError(err.message || 'Upload failed');
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (mediaId: string) => {
        if (!confirm('Delete this image?')) return;

        try {
            await deletePropertyMedia(propertyId, mediaId);
            onMediaChange();
        } catch (err: any) {
            setError(err.message || 'Delete failed');
        }
    };

    const handleSetPrimary = async (mediaId: string) => {
        try {
            await setMediaPrimary(propertyId, mediaId);
            onMediaChange();
        } catch (err: any) {
            setError(err.message || 'Failed to set primary image');
        }
    };

    const getImageUrl = (fileUrl: string) => {
        // If URL is relative, prepend API base URL
        if (fileUrl.startsWith('/')) {
            return `${API_BASE_URL}${fileUrl}`;
        }
        return fileUrl;
    };

    return (
        <div className="space-y-4">
            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Upload Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all
                    ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50'}
                    ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}
                `}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled}
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                        <p className="text-gray-600">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-emerald-100 rounded-full">
                            <Upload className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">
                                Drop images here or click to upload
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                JPG, PNG, WebP up to 5MB each
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Media Grid */}
            {media.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {media.map((item) => (
                        <div
                            key={item.id}
                            className="relative group aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                        >
                            {/* Image */}
                            <img
                                src={getImageUrl(item.file_url)}
                                alt={item.original_filename}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Fallback for broken images
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />

                            {/* Primary Badge */}
                            {item.is_primary && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Primary
                                </div>
                            )}

                            {/* Action Overlay */}
                            {!disabled && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {/* Set Primary Button */}
                                    {!item.is_primary && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetPrimary(item.id);
                                            }}
                                            className="p-2 bg-white rounded-full hover:bg-emerald-100 transition-colors"
                                            title="Set as primary"
                                        >
                                            <Star className="w-4 h-4 text-emerald-600" />
                                        </button>
                                    )}

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item.id);
                                        }}
                                        className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                                        title="Delete"
                                    >
                                        <X className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {media.length === 0 && !uploading && (
                <div className="text-center py-6 text-gray-500">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No photos uploaded yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Properties with photos get 10x more views
                    </p>
                </div>
            )}
        </div>
    );
}
