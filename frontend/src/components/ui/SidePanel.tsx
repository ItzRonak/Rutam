import { useTripStore } from '../../store/useTripStore';
import { Sun, Moon, CheckCircle, AlertTriangle, Info, Loader2, Layers, Map as MapIcon, Mountain, Satellite, Share2, Copy } from 'lucide-react';
import { useChecklist } from '../../hooks/useChecklist';
import { useMutation } from '@tanstack/react-query';
import { scoreRoute } from '../../api/client';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
// Helper to determine color based on segment score
const getScoreColor = (score: number) => {
  if (score >= 80) return '#22c55e'; // Green
  if (score >= 60) return '#eab308'; // Yellow
  if (score >= 40) return '#f97316'; // Orange
  return '#ef4444'; // Red
};

export default function SidePanel() {
  const { departureHour, setDepartureHour, getTripRequest, activeRoute, setActiveRoute, isOffline, activeBaseMap, setActiveBaseMap, activeOverlays, toggleOverlay } = useTripStore();
  const { data: checklistData, isPending: isChecklistPending } = useChecklist(activeRoute);
  
  const [shareLink, setShareLink] = useState<string | null>(null);

  const { mutate, isPending: isRoutePending } = useMutation({
    mutationFn: scoreRoute,
    onSuccess: (data) => {
      setActiveRoute(data);
      setShareLink(null);
    }
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!activeRoute) return null;
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      const res = await axios.post(`${apiBase}/trips/save`, {
        trip_request: getTripRequest(),
        scored_route: activeRoute
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.trip_id) {
        setShareLink(`${window.location.origin}/trip/${data.trip_id}`);
      }
    }
  });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isOffline) {
      mutate(getTripRequest());
    }
  }, [departureHour, isOffline]);

  const isNight = departureHour >= 18 || departureHour <= 5;
  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  if (!activeRoute) return null;

  const compositeScore = activeRoute.composite_score;
  let status = 'OPTIMAL';
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  let StatusIcon = CheckCircle;

  if (compositeScore < 40) {
    status = 'CRITICAL';
    badgeColor = 'bg-red-100 text-red-900 border-red-300';
    StatusIcon = AlertTriangle;
  } else if (compositeScore < 70) {
    status = 'CAUTION';
    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    StatusIcon = Info;
  }

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.1)] border-l border-slate-200 z-[2000] overflow-y-auto font-sans flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 px-6 py-5 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-white font-black tracking-widest text-lg uppercase">Trip Config</h2>
          <p className="text-slate-400 text-xs font-medium">KTM → PKR</p>
        </div>
        <div className={`px-3 py-1.5 rounded border flex items-center gap-1.5 text-xs font-black tracking-wide uppercase ${badgeColor}`}>
          <StatusIcon className="w-4 h-4" aria-hidden="true" />
          {status}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Section A: Trip Context */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Departure Time</h3>
            <div className="flex items-center gap-2 text-slate-800 font-black tracking-tight">
              {isNight ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
              {formatHour(departureHour)}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="23"
            value={departureHour}
            onChange={(e) => setDepartureHour(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-1"
          />
          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>
        </section>

        {/* Section B: Route Status */}
        <section className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Route Status</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white border-[4px] shadow-sm" style={{ borderColor: getScoreColor(compositeScore) }}>
              <span className="text-lg font-black" style={{ color: getScoreColor(compositeScore) }}>
                {compositeScore}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 text-sm">Composite Score</p>
              <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mt-1">
                 <span>Road: {activeRoute.road_score}</span>
                 <span>Surv: {activeRoute.surv_score}</span>
                 <span>Exp: {activeRoute.exp_score}</span>
               </div>
            </div>
          </div>

          {(activeRoute.confidence?.status === 'blocked') && (
            <div className="mb-4 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs font-medium flex items-start gap-2 border border-red-200 shadow-sm">
              <span className="shrink-0 mt-0.5">⚠️</span> 
              <span>Safety Score collapsed to 0 due to active road block/detour.</span>
            </div>
          )}

          <div className="space-y-2">
            {activeRoute.geojson.features.map((feature: any, index: number) => {
              const name = feature.properties?.name || `Segment ${index + 1}`;
              const score = feature.properties?.computed_score ?? 100;
              return (
                <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-600 truncate max-w-[180px]">{name}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: getScoreColor(score) + '20', color: getScoreColor(score) }}>
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section C: Safety Insights */}
        <section className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-800 font-black text-xs uppercase tracking-widest mb-3">
            <Info className="w-4 h-4" />
            Safety Insights
          </div>
          {isChecklistPending ? (
            <div className="flex items-center gap-2 text-indigo-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Generating advice...</span>
            </div>
          ) : checklistData?.llm_safety_advice ? (
            <p className="text-xs text-indigo-900/80 font-medium leading-relaxed">
              {checklistData.llm_safety_advice}
            </p>
          ) : null}
        </section>

        {/* Section D: Map Layers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Map Layers</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button 
              onClick={() => setActiveBaseMap('osm')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeBaseMap === 'osm' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
            >
              <MapIcon className="w-5 h-5 mb-1.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">OSM</span>
            </button>
            <button 
              onClick={() => setActiveBaseMap('satellite')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeBaseMap === 'satellite' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
            >
              <Satellite className="w-5 h-5 mb-1.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sat</span>
            </button>
            <button 
              onClick={() => setActiveBaseMap('terrain')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeBaseMap === 'terrain' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
            >
              <Mountain className="w-5 h-5 mb-1.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Terrain</span>
            </button>
          </div>

          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Admin Boundaries</h4>
          <div className="flex flex-col gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeOverlays.provinces}
                onChange={() => toggleOverlay('provinces')}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-bold tracking-wide group-hover:text-indigo-600 transition-colors">Provinces</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeOverlays.districts}
                onChange={() => toggleOverlay('districts')}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-bold tracking-wide group-hover:text-indigo-600 transition-colors">Districts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeOverlays.local}
                onChange={() => toggleOverlay('local')}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-bold tracking-wide group-hover:text-indigo-600 transition-colors">Local Units</span>
            </label>
          </div>
        </section>

        {/* Share Button */}
        {activeRoute && !isOffline && (
          <section className="pt-2">
            {shareLink ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shareable Link</p>
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 text-xs text-slate-700 bg-transparent outline-none truncate"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareLink)}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => shareMutation.mutate()}
                disabled={shareMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 text-xs tracking-widest uppercase"
              >
                {shareMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {shareMutation.isPending ? 'GENERATING...' : 'SHARE ROUTE'}
              </button>
            )}
          </section>
        )}
      </div>

      {isRoutePending && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-600">Recomputing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
