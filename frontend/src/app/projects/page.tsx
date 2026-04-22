'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { exploreApi } from '@/lib/visualizationApi';
import type { PublicProject } from '@/types/developer';
import { Map, MapPin, Building2, Loader2, ArrowRight } from 'lucide-react';

export default function ProjectsExplorePage() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await exploreApi.listProjects();
        if (res.success) {
          setProjects(res.data);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Interactive Project Explorer
          </h1>
          <p className="text-lg text-gray-600">
            Explore premium real estate projects with our interactive 2D master plans and 3D building visualizers. View real-time availability and select your perfect plot or apartment.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-[#FF385C]" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
            <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No Interactive Projects Yet</h3>
            <p className="text-gray-500 mt-2">Check back later for new interactive real estate projects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(project => (
              <div key={project.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-xl transition-all group flex flex-col">
                <div className="relative aspect-video bg-gray-100 overflow-hidden">
                  {project.master_layout ? (
                    <img 
                      src={project.master_layout} 
                      alt={project.project_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : project.project_images?.[0] ? (
                    <img 
                      src={project.project_images[0]} 
                      alt={project.project_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 uppercase tracking-wide border border-white/20">
                    {project.project_type.replace('_', ' ')}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    {project.available_units} Units Available
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{project.project_name}</h3>
                  <div className="flex items-center text-gray-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1 pb-0.5" />
                    <span className="truncate">{project.location}, {project.city}</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <Link 
                      href={`/projects/${project.id}`}
                      className="w-full flex items-center justify-center gap-2 bg-[#FF385C] text-white py-3 rounded-xl font-bold hover:bg-[#E31C5F] transition-colors"
                    >
                      Explore Interactive Map
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
