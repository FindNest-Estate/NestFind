import React from 'react';
import { ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';
import { useControls } from 'react-zoom-pan-pinch';

export default function ViewControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-1 flex flex-col">
        <button
          onClick={() => zoomIn(0.5)}
          className="p-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors group"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <div className="h-px bg-gray-200 mx-2" />
        <button
          onClick={() => zoomOut(0.5)}
          className="p-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors group"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <div className="h-px bg-gray-200 mx-2" />
        <button
          onClick={() => resetTransform()}
          className="p-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors group"
          title="Reset View"
        >
          <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-1 mt-2">
        <div className="p-3 text-gray-500 rounded-lg flex justify-center items-center" title="Drag to Pan">
          <MousePointer2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
