"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const signupSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    isAgent: z.boolean(),
    agencyName: z.string().optional(),
}).refine((data) => {
    if (data.isAgent && !data.agencyName) {
        return false;
    }
    return true;
}, {
    message: "Agency name is required for agents",
    path: ["agencyName"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            isAgent: false,
        },
    });

    const isAgent = watch("isAgent");

    const onSubmit = async (data: SignupFormValues) => {
        setIsLoading(true);
        setServerError("");

        const dataToSubmit = {
            email: data.email,
            password: data.password,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            role: data.isAgent ? 'agent' : 'buyer',
            agency_name: data.isAgent ? data.agencyName : undefined
        };

        try {
            await api.auth.register(dataToSubmit);
            router.push("/login");
        } catch (err: any) {
            setServerError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Create an account</h1>
                <p className="text-gray-500">Join NestFind to buy, sell, or rent properties.</p>
            </div>

            {serverError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                    {serverError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">First Name</label>
                        <input
                            {...register("firstName")}
                            type="text"
                            className={`w-full px-4 py-3 rounded-lg border ${errors.firstName ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-rose-500"
                                } focus:outline-none focus:ring-2 transition-all`}
                        />
                        {errors.firstName && (
                            <p className="text-sm text-red-500">{errors.firstName.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Last Name</label>
                        <input
                            {...register("lastName")}
                            type="text"
                            className={`w-full px-4 py-3 rounded-lg border ${errors.lastName ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-rose-500"
                                } focus:outline-none focus:ring-2 transition-all`}
                        />
                        {errors.lastName && (
                            <p className="text-sm text-red-500">{errors.lastName.message}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Email</label>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="name@example.com"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-rose-500"
                            } focus:outline-none focus:ring-2 transition-all`}
                    />
                    {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Phone Number</label>
                    <input
                        {...register("phone")}
                        type="tel"
                        placeholder="+91 98765 43210"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-rose-500"
                            } focus:outline-none focus:ring-2 transition-all`}
                    />
                    {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Password</label>
                    <div className="relative">
                        <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-lg border ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-rose-500"
                                } focus:outline-none focus:ring-2 transition-all pr-10`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-sm text-red-500">{errors.password.message}</p>
                    )}
                </div>

                <div className="space-y-4 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            {...register("isAgent")}
                            className="w-5 h-5 text-rose-500 border-gray-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                            I am a Real Estate Agent / Agency
                        </span>
                    </label>

                    {isAgent && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                            <label className="text-sm font-medium text-gray-900">Agency Name / License Number</label>
                            <input
                                {...register("agencyName")}
                                type="text"
                                placeholder="e.g. Luxury Estates Inc."
                                className={`w-full px-4 py-3 rounded-lg border ${errors.agencyName ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-rose-500"
                                    } focus:outline-none focus:ring-2 transition-all`}
                            />
                            {errors.agencyName && (
                                <p className="text-sm text-red-500">{errors.agencyName.message}</p>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        "Create Account"
                    )}
                </button>
            </form>

            <div className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600">
                    Log in
                </Link>
            </div>
        </div>
    );
}
