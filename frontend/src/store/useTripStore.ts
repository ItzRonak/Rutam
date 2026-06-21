import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { TripRequest, ScoredRoute } from '../types';

export type BaseMapKey = 'osm' | 'satellite' | 'terrain';
export type GisToolMode = null | 'distance' | 'buffer' | 'nearest';
export type AppStage = 'landing' | 'routing' | 'exploring';

export interface GisResult {
  type: 'distance' | 'buffer' | 'nearest';
  geojson: any; // GeoJSON Feature to overlay
  label: string;
}

interface TripStore {
  appStage: AppStage;
  departureHour: number;
  activeRoute: ScoredRoute | null;
  checklistData: any;
  hoveredCoordinate: [number, number] | null;
  isOffline: boolean;
  // GIS Tools
  gisToolMode: GisToolMode;
  gisClickPoints: [number, number][];
  gisResult: GisResult | null;
  bufferRadiusKm: number;
  // Layer Control
  activeBaseMap: BaseMapKey;
  activeOverlays: { provinces: boolean; districts: boolean; local: boolean; };
  // POI Tracking
  activePoiCategory: string;
  pois: any;
  // Actions
  setAppStage: (stage: AppStage) => void;
  setDepartureHour: (hour: number) => void;
  setActiveRoute: (route: ScoredRoute) => void;
  setChecklistData: (data: any) => void;
  setHoveredCoordinate: (coord: [number, number] | null) => void;
  setIsOffline: (offline: boolean) => void;
  setGisTool: (mode: GisToolMode) => void;
  addGisClickPoint: (coord: [number, number]) => void;
  setGisResult: (result: GisResult | null) => void;
  setBufferRadius: (km: number) => void;
  clearGisTool: () => void;
  setActiveBaseMap: (key: BaseMapKey) => void;
  toggleOverlay: (overlay: 'provinces' | 'districts' | 'local') => void;
  setActivePoiCategory: (category: string) => void;
  setPois: (fc: any) => void;
  getTripRequest: () => TripRequest;
  loadFromCache: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useTripStore = create<TripStore>((set, get) => ({
  appStage: 'landing',
  departureHour: 10,
  activeRoute: null,
  checklistData: null,
  hoveredCoordinate: null,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  gisToolMode: null,
  gisClickPoints: [],
  gisResult: null,
  bufferRadiusKm: 10,
  activeBaseMap: 'osm',
  activeOverlays: { provinces: false, districts: false, local: false },
  activePoiCategory: 'none',
  pois: null,
  setAppStage: (stage) => set({ appStage: stage }),
  setDepartureHour: (hour) => set({ departureHour: hour }),
  setActiveRoute: (route) => {
    set({ activeRoute: route });
    idbSet('activeRoute', route).catch(console.error);
  },
  setChecklistData: (data) => {
    set({ checklistData: data });
    idbSet('checklistData', data).catch(console.error);
  },
  setHoveredCoordinate: (coord) => set({ hoveredCoordinate: coord }),
  setIsOffline: (offline) => set({ isOffline: offline }),
  setGisTool: (mode) => set({ gisToolMode: mode, gisClickPoints: [], gisResult: null }),
  addGisClickPoint: (coord) => set(state => ({ gisClickPoints: [...state.gisClickPoints, coord] })),
  setGisResult: (result) => set({ gisResult: result }),
  setBufferRadius: (km) => set({ bufferRadiusKm: km }),
  clearGisTool: () => set({ gisToolMode: null, gisClickPoints: [], gisResult: null }),
  setActiveBaseMap: (key) => set({ activeBaseMap: key }),
  toggleOverlay: (overlay) => set(state => ({
    activeOverlays: { ...state.activeOverlays, [overlay]: !state.activeOverlays[overlay] }
  })),
  setActivePoiCategory: (category) => set({ activePoiCategory: category }),
  setPois: (fc) => set({ pois: fc }),
  getTripRequest: () => {
    const d = new Date();
    d.setUTCHours(get().departureHour, 0, 0, 0);
    return {
      origin: [85.3240, 27.7172],
      destination: [83.9856, 28.2096],
      departure_time: d.toISOString(),
      vehicle_type: '4x4',
      persona: 'family'
    };
  },
  loadFromCache: async () => {
    try {
      const cachedRoute = await idbGet('activeRoute');
      const cachedChecklist = await idbGet('checklistData');
      if (cachedRoute) set({ activeRoute: cachedRoute });
      if (cachedChecklist) set({ checklistData: cachedChecklist });
    } catch (e) {
      console.error('Failed to load from IndexedDB', e);
    }
  },
  initialize: async () => {
    if (typeof window === 'undefined') return;
    if (navigator.onLine) {
      set({ isOffline: false });
      try {
        const { scoreRoute } = await import('../api/client');
        const req = get().getTripRequest();
        const data = await scoreRoute(req);
        if (data) {
          set({ activeRoute: data });
          await idbSet('activeRoute', data);
          return;
        }
      } catch (e) {
        console.error('Fresh score-route API call failed, falling back to cache:', e);
      }
      await get().loadFromCache();
    } else {
      set({ isOffline: true });
      await get().loadFromCache();
    }
  }
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useTripStore.getState().setIsOffline(false);
    useTripStore.getState().initialize();
  });
  window.addEventListener('offline', () => {
    useTripStore.getState().setIsOffline(true);
    useTripStore.getState().loadFromCache();
  });
  // Execute startup flow
  useTripStore.getState().initialize();
}
