import { useTripStore, type GisToolMode } from '../../store/useTripStore';
import { Ruler, Circle, MapPin, X, MoreVertical } from 'lucide-react';
import { useState } from 'react';

export default function GISToolbar() {
  const { gisToolMode, setGisTool, clearGisTool, gisResult, bufferRadiusKm, setBufferRadius } = useTripStore();
  const [isOpen, setIsOpen] = useState(false);

  const toggleTool = (mode: GisToolMode) => {
    if (gisToolMode === mode) {
      clearGisTool();
    } else {
      setGisTool(mode);
    }
  };

  return (
    <div className="absolute top-24 left-3 z-[1000] flex flex-col items-start gap-2 font-sans">
      
      {/* 3-Dot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 bg-white border-2 border-slate-200 shadow-md rounded-md flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600 focus:outline-none"
        title="GIS Tools"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Expanded Tools Menu */}
      {isOpen && (
        <div className="bg-white border-2 border-slate-200 shadow-xl rounded-md flex flex-col p-1 gap-1">
          <button
            title="Measure Distance"
            onClick={() => toggleTool('distance')}
            className={`p-2 rounded transition-colors ${gisToolMode === 'distance' ? 'bg-indigo-600 text-white shadow-inner' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
          >
            <Ruler className="w-4 h-4" />
          </button>
          
          <button
            title="Buffer Zone"
            onClick={() => toggleTool('buffer')}
            className={`p-2 rounded transition-colors ${gisToolMode === 'buffer' ? 'bg-indigo-600 text-white shadow-inner' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
          >
            <Circle className="w-4 h-4" />
          </button>

          <button
            title="Nearest POI"
            onClick={() => toggleTool('nearest')}
            className={`p-2 rounded transition-colors ${gisToolMode === 'nearest' ? 'bg-indigo-600 text-white shadow-inner' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Tool Config & Results Overlay */}
      {gisToolMode && (
        <div className="absolute left-12 top-0 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-4 shadow-2xl w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {gisToolMode === 'distance' && 'Measure Distance'}
              {gisToolMode === 'buffer' && 'Create Buffer'}
              {gisToolMode === 'nearest' && 'Find Nearest POI'}
            </h3>
            <button onClick={clearGisTool} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded p-1 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
          
          <p className="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
            {gisToolMode === 'distance' && 'Click two points on the map to measure the straight-line distance.'}
            {gisToolMode === 'buffer' && 'Click a point on the map to draw a hazard buffer zone.'}
            {gisToolMode === 'nearest' && 'Click a point to find the nearest safety POI (Hospital/Fuel).'}
          </p>

          {gisToolMode === 'buffer' && (
            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between mb-2">
                Radius <span>{bufferRadiusKm} km</span>
              </label>
              <input 
                type="range" 
                min="1" max="50" 
                value={bufferRadiusKm} 
                onChange={(e) => setBufferRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          )}

          {gisResult && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center shadow-sm">
              <span className="text-sm font-bold text-indigo-900">{gisResult.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
