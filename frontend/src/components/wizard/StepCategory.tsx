import { useFormContext } from "react-hook-form";
import { Building2, Home, Map, Warehouse, Factory, Building } from "lucide-react";

const categories = [
    { id: "apartment", label: "Apartment", icon: Building2 },
    { id: "villa", label: "Villa", icon: Home },
    { id: "plot", label: "Plot", icon: Map },
    { id: "commercial", label: "Commercial", icon: Building },
    { id: "industrial", label: "Industrial", icon: Factory },
    { id: "farmhouse", label: "Farmhouse", icon: Warehouse },
];

export default function StepCategory() {
    const { register, watch, setValue } = useFormContext();
    const selectedType = watch("property_type");
    const selectedListingType = watch("listing_type");

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What are you listing today?</h2>
                <p className="text-gray-500">Choose the property category that best fits.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        onClick={() => setValue("property_type", cat.id)}
                        className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 hover:border-gray-300 ${selectedType === cat.id
                                ? "border-rose-500 bg-rose-50"
                                : "border-gray-200 bg-white"
                            }`}
                    >
                        <cat.icon
                            size={32}
                            className={selectedType === cat.id ? "text-rose-500" : "text-gray-500"}
                        />
                        <span
                            className={`font-semibold ${selectedType === cat.id ? "text-rose-500" : "text-gray-700"
                                }`}
                        >
                            {cat.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">What is this listing for?</h3>
                <div className="flex gap-4">
                    {["sell", "rent", "lease"].map((type) => (
                        <label
                            key={type}
                            className={`flex-1 cursor-pointer py-3 px-6 rounded-full border text-center font-medium transition-all ${selectedListingType === type
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                                }`}
                        >
                            <input
                                type="radio"
                                value={type}
                                {...register("listing_type")}
                                className="hidden"
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
