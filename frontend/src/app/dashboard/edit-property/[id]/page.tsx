"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

// Steps Components
import StepCategory from "../../../../components/wizard/StepCategory";
import StepLocation from "../../../../components/wizard/StepLocation";
import StepDetails from "../../../../components/wizard/StepDetails";
import StepFeatures from "../../../../components/wizard/StepFeatures";
import StepReview from "../../../../components/wizard/StepReview";

interface PropertyFormData {
    property_type: string;
    listing_type: string;
    address: string;
    city: string;
    state: string;
    specifications: Record<string, any>;
    amenities: string[];
    title: string;
    description: string;
    price: string;
    seller_name: string;
    seller_phone: string;
    images: any[];
}

export default function EditPropertyPage() {
    const params = useParams();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const router = useRouter();
    const methods = useForm<PropertyFormData>({
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
            images: [],
        },
    });

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const data = await api.properties.get(Number(params.id));
                methods.reset({
                    ...data,
                    price: data.price.toString(),
                });
            } catch (error) {
                console.error("Failed to fetch property", error);
                alert("Failed to load property details");
                router.push("/dashboard");
            } finally {
                setIsFetching(false);
            }
        };
        if (params.id) fetchProperty();
    }, [params.id, methods, router]);

    const totalSteps = 5;

    const nextStep = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (step === 4) {
            const images = (methods.getValues("images") as any[]) || [];
            if (images.length < 5) {
                alert("Please upload at least 5 photos to continue.");
                return;
            }
        }
        setStep((prev) => Math.min(prev + 1, totalSteps));
    };
    const prevStep = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "textarea") {
            e.preventDefault();
        }
    };

    const onSubmit = async (data: any) => {
        console.log("EditPropertyPage: onSubmit called", data);
        setIsLoading(true);
        try {
            const payload = {
                ...data,
                price: parseFloat(data.price),
                specifications: data.specifications,
                amenities: data.amenities,
            };

            await api.properties.update(Number(params.id), payload);

            // Upload new images if any
            if (data.images && data.images.length > 0) {
                for (const file of data.images) {
                    await api.properties.uploadImage(Number(params.id), file);
                }
            }

            router.push(`/properties/${params.id}`);
        } catch (error) {
            console.error("Failed to update property", error);
            alert("Failed to update property. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <Loader2 className="animate-spin text-rose-500" size={40} />
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
                    <form onSubmit={methods.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="h-full flex flex-col">
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
                                            <Loader2 className="animate-spin" size={20} /> Updating...
                                        </>
                                    ) : (
                                        "Update Listing"
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
