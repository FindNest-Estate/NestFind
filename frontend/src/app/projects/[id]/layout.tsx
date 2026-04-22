import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProjectExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Minimal Top Bar for immersive view */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 shadow-sm z-50">
        <Link 
          href="/projects" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Projects</span>
        </Link>
        <div className="mx-auto select-none pointer-events-none">
          {/* Logo or Brand */}
          <span className="text-xl font-black tracking-tighter text-[#FF385C]">NestFind</span>
        </div>
        <div className="w-32" /> {/* Spacer for centering */}
      </header>

      {/* Main Content Area (Interactive Viewers) */}
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
}
