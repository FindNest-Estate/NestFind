import { useFormContext } from "react-hook-form";

export default function StepDetails() {
    const { register, watch } = useFormContext();
    const propertyType = watch("property_type");

    const isResidential = ["apartment", "villa", "farmhouse"].includes(propertyType);
    const isLand = ["plot"].includes(propertyType);
    const isCommercial = ["commercial", "industrial"].includes(propertyType);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Let&apos;s get into the details</h2>
                <p className="text-gray-500">Tell us more about the {propertyType || "property"}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common Fields */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Title</label>
                    <input
                        {...register("title")}
                        type="text"
                        placeholder="e.g. Luxury 3BHK Villa with Pool"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Description</label>
                    <textarea
                        {...register("description")}
                        placeholder="Describe the property..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Price (₹)</label>
                    <input
                        {...register("price")}
                        type="number"
                        placeholder="e.g. 5000000"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                    />
                </div>

                {/* Dynamic Fields based on Type */}
                {isResidential && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Bedrooms</label>
                            <input
                                {...register("specifications.bedrooms")}
                                type="number"
                                placeholder="e.g. 3"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Bathrooms</label>
                            <input
                                {...register("specifications.bathrooms")}
                                type="number"
                                placeholder="e.g. 2"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Carpet Area (sqft)</label>
                            <input
                                {...register("specifications.area_sqft")}
                                type="number"
                                placeholder="e.g. 1500"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Furnishing</label>
                            <select
                                {...register("specifications.furnishing")}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            >
                                <option value="">Select</option>
                                <option value="fully_furnished">Fully Furnished</option>
                                <option value="semi_furnished">Semi Furnished</option>
                                <option value="unfurnished">Unfurnished</option>
                            </select>
                        </div>
                    </>
                )}

                {isLand && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Plot Area</label>
                            <div className="flex gap-2">
                                <input
                                    {...register("specifications.area")}
                                    type="number"
                                    placeholder="e.g. 200"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                                />
                                <select
                                    {...register("specifications.area_unit")}
                                    className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                                >
                                    <option value="sq_yards">Sq. Yards</option>
                                    <option value="acres">Acres</option>
                                    <option value="sq_ft">Sq. Ft</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Dimensions (L x W)</label>
                            <input
                                {...register("specifications.dimensions")}
                                type="text"
                                placeholder="e.g. 40x50"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Corner Bit?</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2">
                                    <input type="radio" value="yes" {...register("specifications.is_corner")} /> Yes
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" value="no" {...register("specifications.is_corner")} /> No
                                </label>
                            </div>
                        </div>
                    </>
                )}

                {isCommercial && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Built-up Area (sqft)</label>
                            <input
                                {...register("specifications.area_sqft")}
                                type="number"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Washrooms</label>
                            <input
                                {...register("specifications.washrooms")}
                                type="number"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Parking Spots</label>
                            <input
                                {...register("specifications.parking")}
                                type="number"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Details (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Seller Name</label>
                        <input
                            {...register("seller_name")}
                            type="text"
                            placeholder="Private to you"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Seller Phone</label>
                        <input
                            {...register("seller_phone")}
                            type="text"
                            placeholder="Private to you"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
