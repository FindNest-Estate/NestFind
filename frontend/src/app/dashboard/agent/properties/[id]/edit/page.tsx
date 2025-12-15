"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Steps Components - Reusing from Add Property Wizard
import StepCategory from "../../../../../../components/wizard/StepCategory";
import StepLocation from "../../../../../../components/wizard/StepLocation";
import StepDetails from "../../../../../../components/wizard/StepDetails";
import StepFeatures from "../../../../../../components/wizard/StepFeatures";
import StepReview from "../../../../../../components/wizard/StepReview";

export default function EditPropertyPage() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const router = useRouter();
    const params = useParams();
    const propertyId = params.id as string;

    const methods = useForm({
        defaultValues: {
            property_type: "",
            listing_type: "sell",
            address: "",
            city: "",
            state: "",
            specifications: {},
            amenities: [],
            title: "",
            description: "",
            price: "",
            seller_name: "",
            seller_phone: "",
            images: []
        },
    });

    const totalSteps = 5;

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const data = await api.properties.get(parseInt(propertyId));
                // Transform data to match form structure if needed
                methods.reset({
                    ...data,
                    price: data.price.toString(), // Convert number to string for input
                    // Ensure arrays/objects are initialized
                    specifications: data.specifications || {},
                    amenities: data.amenities || [],
                    images: [] // We don't pre-fill file inputs, but we might show existing images in a custom component later
                });
            } catch (error) {
                console.error("Failed to fetch property", error);
                toast.error("Failed to load property details");
                router.push("/dashboard/agent");
            } finally {
                setIsFetching(false);
            }
        };

        if (propertyId) {
            fetchProperty();
        }
    }, [propertyId, methods, router]);

    const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            // 1. Validate Price
            const priceValue = parseFloat(data.price);
            if (isNaN(priceValue) || priceValue <= 0) {
                toast.error("Please enter a valid price.");
                setIsLoading(false);
                return;
            }

            // 2. Update Property
            const payload = {
                ...data,
                price: priceValue,
                specifications: data.specifications,
                amenities: data.amenities,
            };

            // Remove images from payload as they are handled separately or not updated here directly
            // (If we want to support adding NEW images during edit, we need logic for that)
            // For now, let's assume we update text fields. Image management might need a dedicated section or logic.
            // The existing wizard handles file uploads in `data.images`. 

            await api.properties.update(parseInt(propertyId), payload);

            // 3. Upload NEW Images if any
            if (data.images && data.images.length > 0) {
                for (const file of data.images) {
                    await api.properties.uploadImage(parseInt(propertyId), file);
                }
            }

            toast.success("Property updated successfully");
            router.push("/dashboard/agent");
        } catch (error) {
            console.error("Failed to update property", error);
            toast.error("Failed to update property");
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-rose-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Edit Property</h1>
                <div className="text-sm font-medium text-gray-500">
                    Step {step} of {totalSteps}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-1">
                <div
                    className="bg-rose-500 h-1 transition-all duration-300"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-3xl mx-auto w-full p-8">
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="h-full flex flex-col">
                        <div className="flex-1">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <StepCategory />
                                    </motion.div>
                                )}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <StepLocation />
                                    </motion.div>
                                )}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <StepDetails />
                                    </motion.div>
                                )}
                                {step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <StepFeatures />
                                    </motion.div>
                                )}
                                {step === 5 && (
                                    <motion.div
                                        key="step5"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <StepReview />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Navigation */}
                        <div className="mt-8 flex justify-between pt-6 border-t">
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={step === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${step === 1
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                <ChevronLeft size={20} /> Back
                            </button>

                            {step < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
                                >
                                    Next <ChevronRight size={20} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} /> Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
}
