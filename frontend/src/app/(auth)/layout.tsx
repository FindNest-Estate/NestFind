import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            {/* Left Column: Content */}
            <div className="flex flex-col justify-center p-8 lg:p-12 xl:p-24 bg-white relative">
                <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
                    <Link href="/" className="text-rose-500 font-extrabold text-2xl tracking-tighter">
                        NestFind
                    </Link>
                </div>
                <div className="absolute top-8 right-8 lg:top-12 lg:right-12">
                    <Link href="/admin/login" className="text-sm font-medium text-rose-500 hover:text-rose-600 hover:underline">
                        Login as Admin
                    </Link>
                </div>
                <div className="w-full max-w-md mx-auto mt-12 lg:mt-0">
                    {children}
                </div>
            </div>

            {/* Right Column: Visual */}
            <div className="hidden lg:block relative h-screen w-full bg-gray-100">
                <Image
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80"
                    alt="Luxury Home"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/10" />
            </div>
        </div>
    );
}
