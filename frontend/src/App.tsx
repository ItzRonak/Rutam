import MapView from './components/map/MapView';
import SidePanel from './components/ui/SidePanel';
import CrisisPanel from './components/ui/CrisisPanel';
import GISToolbar from './components/ui/GISToolbar';
import ExplorerDrawer from './components/ui/ExplorerDrawer';
import LandingPage from './components/ui/LandingPage';
import { useTripStore } from './store/useTripStore';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import axios from 'axios';

function TripLoader() {
  const { trip_id } = useParams();
  const navigate = useNavigate();
  const setActiveRoute = useTripStore(state => state.setActiveRoute);

  useEffect(() => {
    if (trip_id) {
      axios.get(`http://localhost:8000/api/v1/trips/${trip_id}`)
        .then(res => {
          setActiveRoute(res.data.scored_route);
        })
        .catch(err => {
          console.error("Failed to load trip:", err);
          navigate("/");
        });
    }
  }, [trip_id, navigate, setActiveRoute]);

  return (
    <>
      <SidePanel />
      <CrisisPanel />
      <GISToolbar />
      <ExplorerDrawer />
      <MapView />
    </>
  );
}

function MapShell() {
  return (
    <>
      <SidePanel />
      <CrisisPanel />
      <GISToolbar />
      <ExplorerDrawer />
      <MapView />
    </>
  );
}

function App() {
  const isOffline = useTripStore(state => state.isOffline);
  const appStage = useTripStore(state => state.appStage);

  return (
    <div className="relative h-screen w-screen bg-slate-50 overflow-hidden">
      {isOffline && (
        <div className="absolute top-0 left-0 w-full z-[2000] bg-yellow-500 text-yellow-950 font-bold text-center py-1.5 shadow-md">
          ⚠️ OFFLINE MODE: Using Cached Data
        </div>
      )}
      <Routes>
        <Route path="/" element={
          appStage === 'landing' ? <LandingPage /> : <MapShell />
        } />
        <Route path="/trip/:trip_id" element={<TripLoader />} />
      </Routes>
    </div>
  )
}

export default App;
