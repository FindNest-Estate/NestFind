'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exploreApi } from '@/lib/visualizationApi';
import { Loader2 } from 'lucide-react';

export default function DemoLayout3D() {
  const router = useRouter();

  useEffect(() => {
    async function loadDemo() {
      // Find the latest demo project
      const res = await exploreApi.listProjects();
      if (res.success && res.data) {
        // Find the latest demo project with polygons
        const demoProject = res.data.find((p: any) => p.name === 'Urban Planning Layout Demo') || res.data[0];
        if (demoProject) {
          router.replace(`/projects/${demoProject.id}?view=3d`);
        }
      }
    }
    loadDemo();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
      <Loader2 className="w-12 h-12 animate-spin text-[#FF385C] mb-4" />
      <h2 className="text-xl font-bold text-gray-900">Loading CAD Layout 3D Demo...</h2>
      <p className="text-gray-500 mt-2">Procedurally expanding polygon geometries</p>
    </div>
  );
}
