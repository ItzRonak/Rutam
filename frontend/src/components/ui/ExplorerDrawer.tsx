import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import axios from 'axios';
import { useTripStore } from '../../store/useTripStore';
import { mapRef } from '../../utils/mapRef';

const CATEGORY_LABELS: Record<string, string> = {
  hazard_zone: 'Hazard Zone',
  fuel_stop: 'Fuel Stop',
  hospital: 'Hospital',
  scenic_poi: 'Scenic POI',
  all: 'All Features',
  none: 'None',
};

const CATEGORY_COLORS: Record<string, string> = {
  hazard_zone: 'bg-red-100 text-red-700',
  fuel_stop: 'bg-amber-100 text-amber-700',
  hospital: 'bg-emerald-100 text-emerald-700',
  scenic_poi: 'bg-sky-100 text-sky-700',
};

export default function ExplorerDrawer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'attributes'>('search');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const activePoiCategory = useTripStore(state => state.activePoiCategory);
  const setActivePoiCategory = useTripStore(state => state.setActivePoiCategory);
  const setPois = useTripStore(state => state.setPois);
  const pois = useTripStore(state => state.pois);

  const handleSearch = async (e: React.FormEvent | React.KeyboardEvent) => {
    console.log('[Search] handleSearch fired. Type:', e.type, 'Term:', searchTerm);
    e.preventDefault();
    if (!searchTerm.trim()) {
      console.log('[Search] Aborted — empty search term');
      return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      const url = `${apiBase}/search/search?q=${encodeURIComponent(searchTerm)}`;
      console.log('[Search] Firing request to:', url);
      const res = await axios.get(url);
      console.log('[Search] Raw response:', res.data);
      setSearchResults(res.data.results ?? []);
      console.log('[Search] Results set. Count:', (res.data.results ?? []).length);
    } catch (err) {
      console.error('[Search] Request failed:', err);
    }
  };

  useEffect(() => {
    if (activePoiCategory === 'none') {
      setPois(null);
      return;
    }
    const fetchPois = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
        const res = await axios.get(`${apiBase}/search/pois?category=${activePoiCategory}`);;
        setPois(res.data);
      } catch (err) {
        console.error("Failed to fetch POIs", err);
      }
    };
    fetchPois();
  }, [activePoiCategory, setPois]);

  const handleRowClick = (feature: any) => {
    const [lng, lat] = feature.geometry.coordinates;
    const name = feature.properties?.name;
    setSelectedRow(name);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  };

  const poiRows = pois?.features ?? [];

  return (
    <div className={`absolute bottom-0 left-0 right-[400px] z-[1000] font-sans transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
      <div className="bg-white/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-200 rounded-t-3xl flex flex-col mx-6">

        {/* Handle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-12 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors rounded-t-3xl group"
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors" />
        </button>

        {/* Drawer Content */}
        <div className="p-6 pt-2 h-[40vh] min-h-[300px] flex flex-col">

          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-3 text-sm font-black tracking-widest uppercase transition-colors ${activeTab === 'search' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Search & Filter
            </button>
            <button
              onClick={() => setActiveTab('attributes')}
              className={`pb-3 text-sm font-black tracking-widest uppercase transition-colors flex items-center gap-2 ${activeTab === 'attributes' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              POI Table
              {poiRows.length > 0 && (
                <span className="text-[10px] bg-indigo-600 text-white rounded-full px-2 py-0.5 font-black">{poiRows.length}</span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-hidden">

            {/* ─── SEARCH & FILTER TAB ─── */}
            {activeTab === 'search' && (
              <div className="flex gap-6 h-full">
                {/* Left Col: Text Search */}
                <div className="flex-1 flex flex-col gap-4">
                  <form onSubmit={handleSearch} className="relative flex items-center">
                    <button
                      type="submit"
                      className="absolute left-4 z-10 text-slate-400 hover:text-indigo-500 transition-colors"
                      aria-label="Search"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      placeholder="Search segments, hazards, POIs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        console.log('[Search] onKeyDown fired. Key:', e.key);
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSearch(e);
                        }
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </form>

                  <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-2">
                    {searchResults.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm font-medium text-slate-400">
                        Type a name and press Enter to search
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {searchResults.map((res, i) => (
                          <div key={i} className="px-4 py-3 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 cursor-pointer flex justify-between items-center transition-colors">
                            <span className="text-sm font-bold text-slate-700">{res.name}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-md">{res.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Col: Category Filter (also drives the POI table) */}
                <div className="w-64 flex flex-col gap-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Filter className="w-4 h-4" />
                    Map Overlays
                  </h3>

                  {['none', 'all', 'hazard_zone', 'fuel_stop', 'hospital', 'scenic_poi'].map(cat => (
                    <label key={cat} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${activePoiCategory === cat ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input
                        type="radio"
                        name="poiCategory"
                        value={cat}
                        checked={activePoiCategory === cat}
                        onChange={() => setActivePoiCategory(cat)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`text-sm font-bold tracking-wide ${activePoiCategory === cat ? 'text-indigo-900' : 'text-slate-600'}`}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ─── POI ATTRIBUTE TABLE TAB ─── */}
            {activeTab === 'attributes' && (
              <div className="h-full overflow-y-auto border border-slate-100 rounded-xl">
                {poiRows.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Filter className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">No POIs loaded</p>
                    <p className="text-xs font-medium text-slate-400 max-w-xs">
                      Select a category in the <span className="text-indigo-500 font-bold">Search & Filter</span> tab to populate this table
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-widest text-right">Pan to</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poiRows.map((feature: any, i: number) => {
                        const p = feature.properties;
                        const name = p?.name ?? `POI ${i + 1}`;
                        const cat = p?.category ?? '';
                        const isSelected = selectedRow === name;
                        return (
                          <tr
                            key={i}
                            onClick={() => handleRowClick(feature)}
                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}
                          >
                            <td className="p-4 font-bold text-slate-800">{name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`}>
                                {CATEGORY_LABELS[cat] ?? cat}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500 font-medium">{p?.description ?? '—'}</td>
                            <td className="p-4 text-right">
                              <span className="text-indigo-400 text-xs font-bold tracking-widest">→ Map</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
