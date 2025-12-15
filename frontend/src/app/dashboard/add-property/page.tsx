"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Steps Components
// Steps Components
import StepCategory from "../../../components/wizard/StepCategory";
import StepLocation from "../../../components/wizard/StepLocation";
import StepDetails from "../../../components/wizard/StepDetails";
import StepFeatures from "../../../components/wizard/StepFeatures";
import StepReview from "../../../components/wizard/StepReview";

export default function AddPropertyPage() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const agentId = searchParams.get('agentId');

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
        },
    });

    // Fetch agent details and auto-fill seller info when agentId is provided
    useEffect(() => {
        const fetchAgentDetails = async () => {
            if (agentId) {
                try {
                    const agent = await api.agents.get(parseInt(agentId));
                    if (agent) {
                        // Auto-fill seller details with agent info
                        methods.setValue('seller_name', `${agent.first_name || ''} ${agent.last_name || ''}`.trim());
                        methods.setValue('seller_phone', agent.phone || '');
                        toast.success(`Seller details auto-filled from agent: ${agent.first_name}`);
                    }
                } catch (error) {
                    console.error("Failed to fetch agent details:", error);
                    // Don't show error toast - it's optional feature
                }
            }
        };

        fetchAgentDetails();
    }, [agentId, methods]);

    const totalSteps = 5;

    const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            // 1. Validate Price
            const priceValue = parseFloat(data.price);
            if (isNaN(priceValue) || priceValue <= 0) {
                alert("Please enter a valid price.");
                setIsLoading(false);
                return;
            }

            // 2. Create Property
            const payload = {
                ...data,
                price: priceValue,
                specifications: data.specifications,
                amenities: data.amenities,
            };

            const newProperty = await api.properties.create(payload);

            // 2. Upload Images if any
            if (data.images && data.images.length > 0) {
                for (const file of data.images) {
                    await api.properties.uploadImage(newProperty.id, file);
                }
            }

            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to create property", error);
            alert("Failed to create property. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">List Your Property</h1>
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
                                            <Loader2 className="animate-spin" size={20} /> Publishing...
                                        </>
                                    ) : (
                                        "Publish Listing"
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
