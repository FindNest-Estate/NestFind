import React, { useState } from 'react';
import { Upload, Plus, Trash2, Save, X, Edit3, Grid } from 'lucide-react';
import type { LayoutPolygon } from '@/types/developer';
import { developerApi } from '@/lib/developerApi';

interface PolygonEditorProps {
  projectId: string;
  existingPolygons: LayoutPolygon[];
  onUpdate: (polygons: LayoutPolygon[]) => void;
  masterPlanImage?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export default function PolygonEditor({
  projectId,
  existingPolygons,
  onUpdate,
  masterPlanImage,
  viewportWidth = 1000,
  viewportHeight = 700,
}: PolygonEditorProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'import'>('import');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'svg' | 'dxf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('nestfind_dev_token');
      
      const res = await fetch(`${API_URL}/developer/polygons/${projectId}/import-${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `Upload failed`);
      }

      const result = await res.json();
      if (result.success) {
        // Fetch fresh polygons
        refreshPolygons();
      }
    } catch (err: any) {
      setError(err.message || 'File import failed.');
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const refreshPolygons = async () => {
    try {
      // Re-fetch using developerApi if available, or just visually refresh
      // For now, we simulate a reload or trigger parent update
      const token = localStorage.getItem('nestfind_dev_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/developer/polygons/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) onUpdate(result.data);
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL polygons for this project?')) return;
    try {
      const token = localStorage.getItem('nestfind_dev_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${API_URL}/developer/polygons/${projectId}/clear`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      refreshPolygons();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Layout Polygon Editor</h2>
          <p className="text-sm text-gray-500">Map your plots, roads, and amenities to the master plan.</p>
        </div>
        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'import' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Import CAD/SVG
          </button>
          <button 
            onClick={() => setActiveTab('draw')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'draw' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Manual Draw
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {activeTab === 'import' ? (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* AutoCAD DXF Import */}
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-all">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">AutoCAD DXF</h3>
                <p className="text-sm text-gray-500 mb-6">Import plot shapes, roads, and parks directly from AutoCAD exports. Labels will be auto-matched.</p>
                
                <label className="relative cursor-pointer bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md inline-block">
                  {isUploading ? 'Uploading...' : 'Select DXF File'}
                  <input type="file" accept=".dxf" className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(e, 'dxf')} />
                </label>
              </div>

              {/* Vector SVG Import */}
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-all">
                <div className="w-16 h-16 bg-[#FF385C]/10 text-[#FF385C] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit3 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Vector Layout (SVG)</h3>
                <p className="text-sm text-gray-500 mb-6">Upload vector illustrations. Ensure plots have unique IDs in your design tool (Figma/Illustrator).</p>
                
                <label className="relative cursor-pointer bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md inline-block">
                  {isUploading ? 'Uploading...' : 'Select SVG File'}
                  <input type="file" accept=".svg" className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(e, 'svg')} />
                </label>
              </div>
            </div>

            {existingPolygons.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-200">
                <div>
                  <span className="font-bold text-gray-900">{existingPolygons.length}</span> polygons currently mapped.
                </div>
                <button 
                  onClick={clearAll}
                  className="text-red-500 hover:text-red-700 font-bold text-sm px-4 py-2 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All Polygons
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
            <Edit3 className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Manual Drawing Editor</h3>
            <p className="text-gray-500 text-center max-w-md mt-2">
              For large scale master plans, we highly recommend using DXF or SVG imports. The manual drawing editor is best suited for small touch-ups.
            </p>
            <button className="mt-6 px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 shadow-sm">
              Open Manual Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
