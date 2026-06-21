import { useTripStore } from '../../store/useTripStore';
import { Layers, Map as MapIcon, Mountain, Satellite } from 'lucide-react';

export default function LayerControlPanel() {
  const { activeBaseMap, setActiveBaseMap, activeOverlays, toggleOverlay } = useTripStore();

  return (
    <div className="absolute top-44 right-6 z-[1000] bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-4 w-64 border border-gray-100 font-sans">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-5 h-5 text-indigo-600" />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Map Layers</h2>
      </div>

      <div className="space-y-4">
        {/* Base Maps */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Base Map</h3>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setActiveBaseMap('osm')}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all ${activeBaseMap === 'osm' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
            >
              <MapIcon className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-bold">OSM</span>
            </button>
            <button 
              onClick={() => setActiveBaseMap('satellite')}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all ${activeBaseMap === 'satellite' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
            >
              <Satellite className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-bold">Sat</span>
            </button>
            <button 
              onClick={() => setActiveBaseMap('terrain')}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all ${activeBaseMap === 'terrain' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
            >
              <Mountain className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-bold">Terrain</span>
            </button>
          </div>
        </div>

        {/* Administrative Overlays */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Admin Boundaries</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeOverlays.provinces}
                onChange={() => toggleOverlay('provinces')}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Provinces</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeOverlays.districts}
                onChange={() => toggleOverlay('districts')}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Districts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeOverlays.local}
                onChange={() => toggleOverlay('local')}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Local Units</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
