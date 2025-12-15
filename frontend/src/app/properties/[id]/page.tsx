"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, MapPin, User, Shield, Trash2, Edit, Calendar, CheckCircle, MessageSquare, Image } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { TimeSlotPicker } from "@/components/common/TimeSlotPicker";
import { toast } from "sonner";
import dynamic from 'next/dynamic';

const MapProvider = dynamic(() => import('@/components/map/MapProvider'), { ssr: false });
const PropertyMap = dynamic(() => import('@/components/map/PropertyMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />
});

export default function PropertyDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");

    // Booking State
    const [preferredSlots, setPreferredSlots] = useState<string[]>([]);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Offer State
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState("");
    const [offerLoading, setOfferLoading] = useState(false);
    const [offerSuccess, setOfferSuccess] = useState(false);

    // Existing Interactions State
    const [existingBooking, setExistingBooking] = useState<any>(null);
    const [existingOffer, setExistingOffer] = useState<any>(null);

    useEffect(() => {
        // Check for action param to auto-open modal
        if (searchParams.get('action') === 'offer') {
            setShowOfferModal(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const data = await api.properties.get(Number(params.id));
                setProperty(data);
                // Also add to recently viewed
                if (user) {
                    api.users.addRecentlyViewed(Number(params.id));
                }
            } catch (error) {
                console.error("Failed to fetch property", error);
            } finally {
                setLoading(false);
            }
        };

        const checkExistingInteractions = async () => {
            if (!user) return;
            try {
                const [bookings, offers] = await Promise.all([
                    api.bookings.list(),
                    api.offers.list()
                ]);

                const booking = bookings.find((b: any) => b.property_id === Number(params.id) && b.status !== 'cancelled');
                const offer = offers.find((o: any) => o.property_id === Number(params.id) && o.status !== 'rejected');

                setExistingBooking(booking);
                setExistingOffer(offer);
            } catch (error) {
                console.error("Failed to check existing interactions", error);
            }
        };

        if (params.id) {
            fetchProperty();
            checkExistingInteractions();
        }
    }, [params.id, user]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.properties.delete(Number(params.id));
            toast.success("Property deleted successfully");
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to delete property", error);
            toast.error("Failed to delete property");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBookVisit = async () => {
        if (!user) {
            router.push("/login");
            return;
        }
        if (preferredSlots.length === 0) {
            toast.error("Please select at least one time slot");
            return;
        }
        setBookingLoading(true);
        try {
            await api.bookings.create({
                property_id: property.id,
                preferred_time_slots: preferredSlots,
                buyer_message: "Interested in visiting"
            });
            setBookingSuccess(true);
            toast.success("Visit request sent successfully!");
            // Refresh interactions
            const bookings = await api.bookings.list();
            const booking = bookings.find((b: any) => b.property_id === Number(params.id) && b.status !== 'cancelled');
            setExistingBooking(booking);
        } catch (error) {
            console.error("Failed to book visit", error);
            toast.error("Failed to book visit. Please try again.");
        } finally {
            setBookingLoading(false);
        }
    };

    const handleMakeOffer = async () => {
        if (!user) {
            router.push("/login");
            return;
        }
        setOfferLoading(true);
        try {
            await api.offers.create({
                property_id: property.id,
                amount: parseFloat(offerAmount)
            });
            setOfferSuccess(true);
            setShowOfferModal(false);
            toast.success("Offer submitted successfully!");
            // Refresh interactions
            const offers = await api.offers.list();
            const offer = offers.find((o: any) => o.property_id === Number(params.id) && o.status !== 'rejected');
            setExistingOffer(offer);
        } catch (error: any) {
            console.error("Failed to make offer", error);
            toast.error(error.message || "Failed to make offer.");
        } finally {
            setOfferLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <Loader2 className="animate-spin text-rose-500" size={40} />
            </div>
        );
    }

    if (!property) {
        return <div className="min-h-screen flex justify-center items-center">Property not found</div>;
    }

    const isOwner = user?.id === property.user_id;

    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    <div className="flex items-center gap-2 text-gray-500 underline font-medium">
                        <MapPin size={16} />
                        {property.address}, {property.city}, {property.state}
                    </div>
                </div>

                {/* Image Grid */}
                {/* Dynamic Image Grid */}
                <div className="relative mb-8 rounded-xl overflow-hidden h-[400px] md:h-[500px] shadow-sm">
                    {property.status?.toLowerCase() === 'sold' && (
                        <div className="absolute top-6 left-6 z-20 bg-rose-600 text-white px-6 py-2 rounded-lg font-bold text-xl shadow-lg border-2 border-white transform -rotate-2">
                            SOLD
                        </div>
                    )}
                    {(() => {
                        const images = property.images || [];
                        const count = images.length;

                        if (count === 0) {
                            return (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-4 bg-white rounded-full shadow-sm">
                                            <Image size={32} />
                                        </div>
                                        <span>No photos available</span>
                                    </div>
                                </div>
                            );
                        }

                        if (count === 1) {
                            return (
                                <div className="w-full h-full relative group">
                                    <img
                                        src={`${api.API_URL}/${images[0].image_path}`}
                                        alt="Property"
                                        className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                    />
                                </div>
                            );
                        }

                        if (count === 2) {
                            return (
                                <div className="grid grid-cols-2 gap-2 h-full">
                                    {images.map((img: any, i: number) => (
                                        <div key={i} className="relative overflow-hidden group">
                                            <img
                                                src={`${api.API_URL}/${img.image_path}`}
                                                alt={`Property ${i + 1}`}
                                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        if (count === 3) {
                            return (
                                <div className="grid grid-cols-2 gap-2 h-full">
                                    <div className="relative overflow-hidden group">
                                        <img
                                            src={`${api.API_URL}/${images[0].image_path}`}
                                            alt="Property 1"
                                            className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                        />
                                    </div>
                                    <div className="grid grid-rows-2 gap-2">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="relative overflow-hidden group">
                                                <img
                                                    src={`${api.API_URL}/${images[i].image_path}`}
                                                    alt={`Property ${i + 1}`}
                                                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        if (count === 4) {
                            return (
                                <div className="grid grid-cols-2 gap-2 h-full">
                                    <div className="relative overflow-hidden group">
                                        <img
                                            src={`${api.API_URL}/${images[0].image_path}`}
                                            alt="Property 1"
                                            className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 grid-rows-2 gap-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className={`relative overflow-hidden group ${i === 1 ? "row-span-2" : ""}`}>
                                                <img
                                                    src={`${api.API_URL}/${images[i].image_path}`}
                                                    alt={`Property ${i + 1}`}
                                                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // 5 or more images (Airbnb style)
                        return (
                            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-full">
                                <div className="col-span-2 row-span-2 relative overflow-hidden group cursor-pointer">
                                    <img
                                        src={`${api.API_URL}/${images[0].image_path}`}
                                        alt="Main"
                                        className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                                </div>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="relative overflow-hidden group bg-gray-100 cursor-pointer">
                                        {images[i] ? (
                                            <>
                                                <img
                                                    src={`${api.API_URL}/${images[i].image_path}`}
                                                    alt={`Gallery ${i}`}
                                                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <div className="w-full h-full bg-gray-200 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="flex justify-between items-center pb-6">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">
                                    {property.property_type} hosted by {property.seller_name || "Agent"}
                                </h2>
                                <div className="text-gray-500 mt-1 flex flex-wrap gap-2 text-sm">
                                    {["apartment", "villa", "farmhouse"].includes(property.property_type) && (
                                        <>
                                            <span>{property.specifications?.bedrooms || 0} bedrooms</span>
                                            <span>·</span>
                                            <span>{property.specifications?.bathrooms || 0} bathrooms</span>
                                            <span>·</span>
                                            <span>{property.specifications?.area_sqft} sqft</span>
                                        </>
                                    )}
                                    {property.property_type === "plot" && (
                                        <>
                                            <span>{property.specifications?.area} {property.specifications?.area_unit}</span>
                                            <span>·</span>
                                            <span>{property.specifications?.dimensions}</span>
                                        </>
                                    )}
                                    {["commercial", "industrial"].includes(property.property_type) && (
                                        <>
                                            <span>{property.specifications?.area_sqft} sqft</span>
                                            <span>·</span>
                                            <span>{property.specifications?.parking || 0} Parking</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="h-14 w-14 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="text-gray-500" />
                            </div>
                        </div>

                        <div className="pb-6">
                            <div className="flex items-start gap-4">
                                <Shield className="text-gray-900 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-gray-900">Secure Booking</h3>
                                    <p className="text-gray-500 text-sm">Your booking is protected by NestFindCover.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">About this place</h3>
                            <p className="text-gray-700 leading-relaxed">{property.description}</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {property.amenities?.map((amenity: string) => (
                                    <div key={amenity} className="flex items-center gap-3 text-gray-700">
                                        <div className="h-2 w-2 bg-gray-900 rounded-full" />
                                        {amenity}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Location Map */}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Where you'll be</h3>
                            <div className="h-[400px] w-full">
                                <MapProvider>
                                    <PropertyMap
                                        latitude={property.latitude}
                                        longitude={property.longitude}
                                        title={property.title}
                                        price={`₹${property.price.toLocaleString()}`}
                                    />
                                </MapProvider>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Booking/Action Card */}
                    <div className="md:col-span-1">
                        <div className="rounded-xl p-6 shadow-xl sticky top-32 bg-white">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <span className="text-2xl font-bold">₹{property.price.toLocaleString()}</span>
                                    <span className="text-gray-500"> / total</span>
                                </div>
                            </div>

                            {isOwner ? (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => router.push(`/dashboard/edit-property/${params.id}`)}
                                        className="w-full py-3 bg-white shadow-md text-black rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                                    >
                                        <Edit size={18} /> Edit Listing
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="w-full py-3 bg-red-50 text-red-500 rounded-lg font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={18} /> Delete Listing
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Schedule Visit Section */}
                                    {existingBooking ? (
                                        <div className="border rounded-lg p-4 bg-blue-50 border-blue-100">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-blue-800">
                                                <Calendar size={18} /> Visit Scheduled
                                            </div>
                                            <p className="text-sm text-blue-700 mb-2">
                                                {existingBooking.approved_slot ? (
                                                    <>You have a visit scheduled for {new Date(existingBooking.approved_slot).toLocaleString()}.</>
                                                ) : (
                                                    <>You have requested a visit. Status: {existingBooking.status}</>
                                                )}
                                            </p>
                                            <div className="text-xs font-medium uppercase tracking-wide text-blue-600 bg-blue-100 inline-block px-2 py-1 rounded">
                                                Status: {existingBooking.status}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                            <div className="mb-6">
                                                <TimeSlotPicker
                                                    value={preferredSlots}
                                                    onChange={setPreferredSlots}
                                                    maxSlots={5}
                                                />
                                            </div>

                                            {bookingSuccess ? (
                                                <div className="mt-4 bg-green-50 text-green-700 p-4 rounded-lg text-center font-medium flex items-center justify-center gap-2 border border-green-100">
                                                    <CheckCircle size={20} /> Request Sent Successfully!
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <button
                                                        onClick={handleBookVisit}
                                                        disabled={preferredSlots.length === 0 || bookingLoading}
                                                        className={`
                                                            w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200
                                                            flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                                                            ${preferredSlots.length > 0 && !bookingLoading
                                                                ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white'
                                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none hover:transform-none'
                                                            }
                                                        `}
                                                    >
                                                        {bookingLoading ? (
                                                            <>
                                                                <Loader2 className="animate-spin" size={24} />
                                                                Sending Request...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                                                </svg>
                                                                <span>Request Visit Now</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    <button className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center justify-center gap-2">
                                                        <MessageSquare size={18} />
                                                        Message Agent
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-center text-gray-400 text-xs my-2">OR</div>

                                    {existingOffer ? (
                                        <div className="border rounded-lg p-4 bg-purple-50 border-purple-100">
                                            <div className="flex items-center gap-2 mb-2 font-semibold text-purple-800">
                                                <Shield size={18} /> Offer Active
                                            </div>
                                            <p className="text-sm text-purple-700 mb-2">
                                                You have an active offer of ₹{existingOffer.amount.toLocaleString()}.
                                            </p>
                                            <div className="text-xs font-medium uppercase tracking-wide text-purple-600 bg-purple-100 inline-block px-2 py-1 rounded">
                                                Status: {existingOffer.status}
                                            </div>
                                        </div>
                                    ) : offerSuccess ? (
                                        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-center text-sm font-medium flex items-center justify-center gap-2">
                                            <CheckCircle size={16} /> Offer Submitted!
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowOfferModal(true)}
                                            className="w-full py-3 bg-white shadow-md text-black rounded-lg font-semibold hover:shadow-lg transition"
                                        >
                                            Make an Offer
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Property?</h3>
                            <p className="text-gray-500 mb-4">This action cannot be undone. Please tell us why you are removing this listing.</p>

                            <div className="space-y-3 mb-6">
                                {["Sold/Rented", "Mistake in Listing", "No longer available", "Other"].map((reason) => (
                                    <label key={reason} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="reason"
                                            value={reason}
                                            checked={deleteReason === reason}
                                            onChange={(e) => setDeleteReason(e.target.value)}
                                            className="text-rose-500 focus:ring-rose-500"
                                        />
                                        <span className="text-gray-700">{reason}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeleteReason(""); }}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={!deleteReason || isDeleting}
                                    className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Offer Modal */}
            {
                showOfferModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Make an Offer</h3>
                            <p className="text-gray-500 mb-4">Enter the amount you want to offer for this property.</p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Amount (₹)</label>
                                <input
                                    type="number"
                                    value={offerAmount}
                                    onChange={(e) => setOfferAmount(e.target.value)}
                                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-rose-500 outline-none"
                                    placeholder="e.g. 8500000"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowOfferModal(false)}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMakeOffer}
                                    disabled={!offerAmount || offerLoading}
                                    className="flex-1 py-2.5 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50"
                                >
                                    {offerLoading ? "Submitting..." : "Submit Offer"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
