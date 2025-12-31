import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "NestFind - Trusted Real Estate Platform",
    description: "Find your perfect home with verified agents and secure transactions",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
