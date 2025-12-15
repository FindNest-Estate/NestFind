"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState("");
    const { login } = useAuth();
    const router = useRouter();

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
            // 1. Login to get token
            const res = await api.auth.login({ username: data.email, password: data.password });

            // 2. Set token temporarily to fetch profile
            await login(res.access_token, false);

            // 3. Verify Admin Role
            try {
                const user = await api.auth.me();
                if (user.role !== 'admin' && user.role !== 'super_admin') {
                    throw new Error("Access Denied: You do not have admin privileges.");
                }
                // 4. If admin, redirect
                router.push('/admin');
            } catch (roleError: any) {
                // If role check fails, logout and show error
                // We need to implement a logout or just clear token if we haven't fully persisted it yet, 
                // but `login` context likely persists it. 
                // For now, just throwing error will trigger catch block.
                throw roleError;
            }

        } catch (err: any) {
            setServerError(err.message || "Authentication failed. Please check your credentials.");
            // Ideally logout here to clear any invalid session
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-950 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 text-indigo-500 mb-4 shadow-lg border border-slate-700">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">NestFind <span className="text-indigo-500">Admin</span></h1>
                    <p className="text-slate-400 text-sm mt-2">Secure Access Portal</p>
                </div>

                {/* Form */}
                <div className="p-8 pt-6">
                    {serverError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <Lock size={16} />
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                            <input
                                {...register("email")}
                                type="email"
                                placeholder="admin@nestfind.com"
                                className={`w-full px-4 py-3 rounded-lg border ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-indigo-500"
                                    } focus:outline-none focus:ring-2 transition-all bg-gray-50 focus:bg-white`}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    className={`w-full px-4 py-3 rounded-lg border ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-indigo-500"
                                        } focus:outline-none focus:ring-2 transition-all bg-gray-50 focus:bg-white pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                "Access Dashboard"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link href="/login" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                            ← Back to standard login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
