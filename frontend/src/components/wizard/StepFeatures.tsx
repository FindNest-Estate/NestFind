import { useFormContext } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";

const commonAmenities = ["Gym", "Swimming Pool", "Parking", "Lift", "Security", "Power Backup", "Club House"];

export default function StepFeatures() {
    const { register, watch, setValue } = useFormContext();
    const amenities = watch("amenities") || [];
    const [customFeature, setCustomFeature] = useState("");
    const params = useParams();

    const toggleAmenity = (amenity: string) => {
        if (amenities.includes(amenity)) {
            setValue("amenities", amenities.filter((a: string) => a !== amenity));
        } else {
            setValue("amenities", [...amenities, amenity]);
        }
    };

    const addCustomFeature = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && customFeature.trim()) {
            e.preventDefault();
            if (!amenities.includes(customFeature.trim())) {
                setValue("amenities", [...amenities, customFeature.trim()]);
            }
            setCustomFeature("");
        }
    };

    const getImageSrc = (file: any) => {
        if (file instanceof File) {
            return URL.createObjectURL(file);
        }
        if (file?.image_path) {
            return `${api.API_URL}/${file.image_path}`;
        }
        return null;
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Features & Amenities</h2>
                <p className="text-gray-500">What makes this property stand out?</p>
            </div>

            <div className="space-y-4">
                <label className="text-sm font-medium text-gray-900">Common Features</label>
                <div className="flex flex-wrap gap-3">
                    {commonAmenities.map((amenity) => (
                        <button
                            key={amenity}
                            type="button"
                            onClick={() => toggleAmenity(amenity)}
                            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${amenities.includes(amenity)
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                                }`}
                        >
                            {amenity}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Add Custom Feature</label>
                <div className="relative">
                    <input
                        type="text"
                        value={customFeature}
                        onChange={(e) => setCustomFeature(e.target.value)}
                        onKeyDown={addCustomFeature}
                        placeholder="Type and press Enter (e.g. Solar Fencing)"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (customFeature.trim()) {
                                if (!amenities.includes(customFeature.trim())) {
                                    setValue("amenities", [...amenities, customFeature.trim()]);
                                }
                                setCustomFeature("");
                            }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Selected Tags Display */}
            {amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {amenities.map((amenity: string) => (
                        <div key={amenity} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm flex items-center gap-2">
                            {amenity}
                            <button type="button" onClick={() => toggleAmenity(amenity)} className="text-gray-500 hover:text-red-500">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {/* Image Upload Section */}
            <div className="space-y-4 pt-6 border-t">
                <label className="text-sm font-medium text-gray-900">Property Photos</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 hover:bg-rose-50 transition h-32">
                        <Plus className="text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Add Photo</span>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const currentImages = watch("images") || [];
                                setValue("images", [...currentImages, ...files]);
                            }}
                        />
                    </label>
                    {(watch("images") || []).map((file: any, index: number) => (
                        <div key={index} className="relative rounded-xl overflow-hidden h-32 border border-gray-200 group">
                            <img
                                src={getImageSrc(file) || "/placeholder.png"}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const currentImages = watch("images") || [];
                                    const imageToDelete = currentImages[index];

                                    if (imageToDelete.id && params.id) {
                                        try {
                                            await api.properties.deleteImage(Number(params.id), imageToDelete.id);
                                            setValue("images", currentImages.filter((_: any, i: number) => i !== index));
                                        } catch (error) {
                                            console.error("Failed to delete image", error);
                                            alert("Failed to delete image");
                                        }
                                    } else {
                                        setValue("images", currentImages.filter((_: any, i: number) => i !== index));
                                    }
                                }}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
