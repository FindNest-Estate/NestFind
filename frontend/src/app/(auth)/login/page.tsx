"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState("");
    const { login } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setServerError("");
        try {
            const res = await api.auth.login({ username: data.email, password: data.password });
            await login(res.access_token);
        } catch (err: any) {
            setServerError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
                <p className="text-gray-500">Enter your details to access your account.</p>
            </div>

            {serverError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                    {serverError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-900">Password</label>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-rose-500 hover:text-rose-600"
                        >
                            Forgot Password?
                        </Link>
                    </div>
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

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        "Continue"
                    )}
                </button>
            </form>

            <div className="text-center text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-semibold text-rose-500 hover:text-rose-600">
                    Sign up
                </Link>
            </div>
        </div>
    );
}
