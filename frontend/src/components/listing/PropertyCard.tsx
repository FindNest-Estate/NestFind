import Image from 'next/image';
import { Heart, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface PropertyCardProps {
    data: any;
}

export default function PropertyCard({ data }: PropertyCardProps) {
    const hasImage = data.images && data.images.length > 0;
    const imageUrl = hasImage
        ? `${api.API_URL}/${data.images[0].image_path}`
        : null;

    return (
        <Link href={`/properties/${data.id}`}>
            <div className="col-span-1 cursor-pointer group">
                <div className="flex flex-col gap-2 w-full">
                    <div className="aspect-square w-full relative overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center">
                        {imageUrl ? (
                            <img
                                alt="Listing"
                                src={imageUrl}
                                className="object-cover h-full w-full group-hover:scale-110 transition"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-neutral-400">
                                <ImageIcon size={40} className="mb-2 opacity-50" />
                                <span className="text-sm font-medium">No Image</span>
                            </div>
                        )}
                        <div className="absolute top-3 right-3">
                            <Heart size={24} className="fill-white/0 stroke-white hover:fill-rose-500 hover:stroke-rose-500 transition" />
                        </div>
                        {data.status?.toLowerCase() === 'sold' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                <span className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-lg transform -rotate-12 border-2 border-white shadow-xl">
                                    SOLD
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="font-bold text-lg text-gray-900 truncate">
                        {data.title}
                    </div>
                    <div className="font-light text-neutral-500 truncate">
                        {data.property_type} • {data.city}
                    </div>
                    <div className="flex flex-row items-center gap-1">
                        <div className="font-bold text-gray-900">
                            ₹{data.price.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
