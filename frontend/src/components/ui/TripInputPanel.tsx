import { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { Sun, Moon, AlertTriangle, CheckCircle, Info, Loader2, Share2, Copy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { scoreRoute } from '../../api/client';
import axios from 'axios';
import SidePanel from './SidePanel';

export default function TripInputPanel() {
  const { departureHour, setDepartureHour, getTripRequest, activeRoute, setActiveRoute, isOffline } = useTripStore();

  const [shareLink, setShareLink] = useState<string | null>(null);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: scoreRoute,
    onSuccess: (data) => {
      setActiveRoute(data);
      setShareLink(null); // Reset share link when route changes
    }
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!activeRoute) return null;
      const res = await axios.post('http://localhost:8000/api/v1/trips/save', {
        trip_request: getTripRequest(),
        scored_route: activeRoute
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.trip_id) {
        setShareLink(`http://localhost:5173/trip/${data.trip_id}`);
      }
    }
  });



  const isFirstRender = useRef(true);

  // Trigger backend mutation whenever departure hour changes (skip initial mount since LandingPage handles it)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isOffline) {
      mutate(getTripRequest());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departureHour, isOffline]);

  // EMPTY STATE: Route Data Failed to Load or is computing
  if ((isPending && !isOffline) || (!activeRoute && !isOffline && isPending)) {
    return (
      <div className="absolute top-6 left-6 z-[1000] w-80 bg-white/80 backdrop-blur-xl max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        <p className="text-sm font-bold tracking-widest text-slate-500 uppercase">
          {isPending ? "Computing..." : "Loading Data..."}
        </p>
      </div>
    );
  }

  if (!activeRoute) {
    return (
      <div className="absolute top-6 left-6 z-[1000] w-80 bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-bold tracking-widest text-slate-500 uppercase">
          No Route Available
        </p>
      </div>
    );
  }

  if (isError && !isOffline) {
    return (
      <div className="absolute top-6 left-6 z-[1000] w-80 bg-red-50 border border-red-200 shadow-2xl rounded-2xl p-6 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <p className="text-sm font-bold text-red-700">Failed to connect to Brain</p>
      </div>
    );
  }

  // Define what counts as night for the icon
  const isNight = departureHour >= 18 || departureHour <= 5;
  const compositeScore = activeRoute.composite_score;

  // Derive badge status
  let status = 'OPTIMAL';
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  let Icon = CheckCircle;

  if (compositeScore < 40) {
    status = 'CRITICAL';
    badgeColor = 'bg-red-100 text-red-900 border-red-300';
    Icon = AlertTriangle;
  } else if (compositeScore < 70) {
    status = 'CAUTION';
    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    Icon = Info;
  }

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  return (
    <div className="absolute top-6 left-6 z-[1000] w-80 bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl overflow-hidden font-sans max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
        <h2 className="text-white font-bold tracking-widest text-sm uppercase">Trip Config</h2>
        <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-[11px] font-black tracking-wide uppercase ${badgeColor}`}>
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {status}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Time Slider Section */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <label htmlFor="time-slider" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Departure Time
            </label>
            <div className="flex items-center gap-2 text-slate-900 font-black text-lg tracking-tight" aria-live="polite">
              {isNight ? <Moon className="w-5 h-5 text-indigo-600" aria-label="Night" /> : <Sun className="w-5 h-5 text-amber-500" aria-label="Day" />}
              {formatHour(departureHour)}
            </div>
          </div>

          <input
            id="time-slider"
            type="range"
            min="0"
            max="23"
            value={departureHour}
            onChange={(e) => setDepartureHour(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            aria-valuemin={0}
            aria-valuemax={23}
            aria-valuenow={departureHour}
            aria-valuetext={`Departure time set to ${formatHour(departureHour)}`}
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest" aria-hidden="true">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Informational subtext */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 font-medium leading-relaxed">
          Adjusting the departure time applies deterministic penalties based on historical hazard data and visibility constraints.
        </div>

        {/* LLM Advisor Safety Insights */}
        <SidePanel />

        {/* Share Button */}
        {activeRoute && !isOffline && (
          <div className="pt-2">
            {shareLink ? (
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shareable Link Ready</p>
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm border border-slate-200">
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
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 text-sm"
              >
                {shareMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {shareMutation.isPending ? 'GENERATING...' : 'GENERATE SHAREABLE LINK'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
