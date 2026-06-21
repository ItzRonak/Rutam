import { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { scoreRoute } from '../../api/client';
import { del as idbDel } from 'idb-keyval';

// Fixed value sets for the form — backend is plain str (no enum),
// but we constrain to sensible values to avoid invalid DB entries.
const CRISIS_TYPES = ['road_blockage', 'landslide', 'flood', 'accident', 'bridge_damage'];
const SEVERITIES   = ['low', 'medium', 'high', 'critical'];

export default function CrisisPanel() {
  const hoveredCoordinate  = useTripStore((s) => s.hoveredCoordinate);
  const activeRoute        = useTripStore((s) => s.activeRoute);
  const getTripRequest     = useTripStore((s) => s.getTripRequest);
  const setActiveRoute     = useTripStore((s) => s.setActiveRoute);
  const gisResult          = useTripStore((s) => s.gisResult);
  const gisClickPoints     = useTripStore((s) => s.gisClickPoints);
  const setGisTool         = useTripStore((s) => s.setGisTool);
  const clearGisTool       = useTripStore((s) => s.clearGisTool);
  const bufferRadiusKm     = useTripStore((s) => s.bufferRadiusKm);
  const setBufferRadius    = useTripStore((s) => s.setBufferRadius);

  const [phase, setPhase]               = useState<'idle' | 'picking' | 'form' | 'success' | 'error'>('idle');
  const [pinnedCoord, setPinnedCoord]   = useState<[number, number] | null>(null);
  const [crisisType, setCrisisType]     = useState(CRISIS_TYPES[0]);
  const [severity, setSeverity]         = useState(SEVERITIES[2]);  // default: high
  const [apiError, setApiError]         = useState<string | null>(null);
  const [result, setResult]             = useState<any>(null);

  const routeMutation = useMutation({
    mutationFn: scoreRoute,
    onSuccess: (data) => setActiveRoute(data),
  });

  const reportMutation = useMutation({
    mutationFn: async (payload: { type: string; latitude: number; longitude: number; severity: string }) => {
      console.log('[ReportBlockage] POSTing to /api/v1/crisis/report-crisis with:', payload);
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      const res = await axios.post(`${apiBase}/crisis/report-crisis`, payload);
      console.log('[ReportBlockage] Raw response:', res.data);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setPhase('success');
      clearGisTool();
      routeMutation.mutate(getTripRequest());
    },
    onError: (err: any) => {
      console.error('[ReportBlockage] Request failed:', err);
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
      setApiError(msg);
      setPhase('error');
    },
  });

  // When GIS buffer mode captures a point, move to the form phase
  useEffect(() => {
    if (phase === 'picking' && gisResult?.type === 'buffer' && gisClickPoints.length > 0) {
      // gisClickPoints stores [lat, lng] — confirmed from useGISTools.ts line 44
      const [lat, lng] = gisClickPoints[gisClickPoints.length - 1];
      console.log('[ReportBlockage] Pinned blockage location [lat, lng]:', lat, lng);
      setPinnedCoord([lat, lng]);
      setPhase('form');
    }
  }, [gisResult, gisClickPoints, phase]);

  const handleReportClick = () => {
    setPhase('picking');
    setResult(null);
    setApiError(null);
    setPinnedCoord(null);
    // Activate buffer tool so the existing MapEventsTracker handles clicks
    setGisTool('buffer');
  };

  const handleCancel = () => {
    setPhase('idle');
    clearGisTool();
    setPinnedCoord(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinnedCoord) {
      setApiError('No location pinned — click the map first.');
      return;
    }
    const [lat, lng] = pinnedCoord;  // [lat, lng] order confirmed consistent
    reportMutation.mutate({ type: crisisType, latitude: lat, longitude: lng, severity });
  };

  const handleClearBlockages = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      await axios.post(`${apiBase}/crisis/clear-blockages`);
      setPhase('idle');
      setResult(null);
      await idbDel('activeRoute');
      useTripStore.setState({ activeRoute: null });
      routeMutation.mutate(getTripRequest());
    } catch (e) {
      console.error('Failed to clear blockages:', e);
    }
  };

  return (
    <div className="absolute bottom-20 right-[400px] z-[1000] w-72 flex flex-col gap-2">

      {/* Detour Active Banner */}
      {activeRoute?.confidence.status === 'blocked' && (
        <div className="bg-orange-100/90 backdrop-blur-md border border-orange-400 text-orange-800 px-4 py-3 rounded-xl shadow-2xl font-medium flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="block font-black text-sm">DETOUR ACTIVE</span>
            <span className="text-xs">Route blocked. Diverting to safe location.</span>
          </div>
        </div>
      )}

      {/* Crisis Report Widget */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-2xl rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Crisis Report</h3>

        {/* Coordinate indicator — shows live hover OR pinned point */}
        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg font-mono flex flex-col gap-0.5">
          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">
            {pinnedCoord ? 'Pinned Location' : 'Cursor Pos'}
          </span>
          <span className="text-orange-400 font-bold text-sm">
            {pinnedCoord
              ? `${pinnedCoord[0].toFixed(4)}, ${pinnedCoord[1].toFixed(4)}`
              : hoveredCoordinate
                ? `${hoveredCoordinate[0].toFixed(4)}, ${hoveredCoordinate[1].toFixed(4)}`
                : 'Hover over map...'}
          </span>
        </div>

        {/* PHASE: idle */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-2">
            <button
              id="report-blockage-btn"
              onClick={handleReportClick}
              className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all text-sm bg-red-600 hover:bg-red-700 hover:shadow-red-200 hover:shadow-xl active:scale-[0.97]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              REPORT BLOCKAGE
            </button>
            <button
              onClick={handleClearBlockages}
              className="text-xs text-slate-400 hover:text-slate-600 underline text-center pt-1"
            >
              Clear All Blockages
            </button>
          </div>
        )}

        {/* PHASE: picking — waiting for map click */}
        {phase === 'picking' && (
          <div className="flex flex-col gap-2">
            {/* Radius slider — reusing same Buffer tool UX */}
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Radius <span className="font-bold text-indigo-600">{bufferRadiusKm} km</span></span>
            </div>
            <input
              type="range" min={1} max={20} step={1}
              value={bufferRadiusKm}
              onChange={(e) => setBufferRadius(parseInt(e.target.value))}
              className="w-full accent-red-600"
            />
            <p className="text-xs text-slate-500 italic">
              🖱 Click the map to pin the blockage location. Cursor is in crosshair mode.
            </p>
            <button onClick={handleCancel} className="text-xs text-slate-400 hover:text-red-500 underline self-start">
              Cancel
            </button>
          </div>
        )}

        {/* PHASE: form — location pinned, collect type + severity */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" id="blockage-report-form">
            <p className="text-xs text-slate-500">
              Location pinned. Select type and severity then submit.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Blockage Type</label>
              <select
                id="crisis-type-select"
                value={crisisType}
                onChange={(e) => setCrisisType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-all"
              >
                {CRISIS_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Severity</label>
              <div className="flex gap-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => setSeverity(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${
                      severity === s
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-red-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={reportMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reportMutation.isPending ? 'Submitting…' : 'Submit Report'}
              </button>
              <button
                type="button" onClick={handleCancel}
                className="px-3 py-2 rounded-xl text-xs text-slate-500 border border-slate-200 hover:border-red-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* PHASE: success — result card matching GIS result style */}
        {phase === 'success' && result && (
          <div className="flex flex-col gap-2">
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Detour Recommended</span>
              <p className="font-bold text-sm text-slate-800">{result.primary_label}</p>
              <p className="text-xs text-slate-600">{result.status_line}</p>
              {result.detour_name && (
                <p className="text-xs text-emerald-700 font-medium mt-1">📍 {result.detour_name}</p>
              )}
            </div>
            <button
              onClick={() => setPhase('idle')}
              className="text-xs text-slate-400 hover:text-slate-600 underline self-start"
            >
              Report another blockage
            </button>
          </div>
        )}

        {/* PHASE: error */}
        {phase === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="bg-red-50 border border-red-300 rounded-xl p-3">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Report Failed</span>
              <p className="text-xs text-slate-700 mt-1">{apiError}</p>
            </div>
            <button
              onClick={() => setPhase('idle')}
              className="text-xs text-slate-400 hover:text-slate-600 underline self-start"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
