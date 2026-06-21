import { useTripStore } from '../../store/useTripStore';
import { MapPin, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { scoreRoute } from '../../api/client';

export default function LandingPage() {
  const setAppStage = useTripStore((state) => state.setAppStage);
  const getTripRequest = useTripStore((state) => state.getTripRequest);
  const setActiveRoute = useTripStore((state) => state.setActiveRoute);

  const { mutate, isPending } = useMutation({
    mutationFn: scoreRoute,
    onSuccess: (data) => {
      setActiveRoute(data);
      setAppStage('routing');
    }
  });

  return (
    <div className="absolute inset-0 z-[5000] bg-slate-900 flex flex-col items-center justify-center font-sans text-white">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
          <MapPin className="w-8 h-8 text-indigo-400" />
        </div>
        
        <h1 className="text-3xl font-black mb-2 tracking-tight">Rutam</h1>
        <p className="text-slate-400 font-medium mb-8 text-center">
          Intelligent routing and hazard tracking.
        </p>
        
        <div className="w-full space-y-4 mb-8">
          <div className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Origin</p>
            <p className="text-lg font-bold text-white">Kathmandu (KTM)</p>
          </div>
          
          <div className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Destination</p>
            <p className="text-lg font-bold text-white">Pokhara (PKR)</p>
          </div>
        </div>

        <button 
          onClick={() => mutate(getTripRequest())}
          disabled={isPending}
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              COMPUTING ROUTE...
            </>
          ) : (
            'Find Safe Route'
          )}
        </button>
      </div>
    </div>
  );
}
