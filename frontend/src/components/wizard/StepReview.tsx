import { useFormContext } from "react-hook-form";

export default function StepReview() {
    const { register, watch } = useFormContext();
    const values = watch();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Price</h2>
                <p className="text-gray-500">Set your price and review the listing.</p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Price (INR)</label>
                <input
                    {...register("price")}
                    type="number"
                    placeholder="e.g. 15000000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition text-xl font-semibold"
                />
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Listing Summary</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span className="font-medium capitalize">{values.property_type}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Listing For</span>
                        <span className="font-medium capitalize">{values.listing_type}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Location</span>
                        <span className="font-medium">{values.city}, {values.state}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Title</span>
                        <span className="font-medium">{values.title}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
