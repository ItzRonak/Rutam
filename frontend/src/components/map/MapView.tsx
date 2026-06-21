import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection, LineString } from 'geojson';
import { useTripStore } from '../../store/useTripStore';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useGISTools } from '../../hooks/useGISTools';
import { mapRef } from '../../utils/mapRef';

// Captures the Leaflet map instance into the shared mapRef on mount
function MapRefCapture() {
  const map = useMap();
  mapRef.current = map;
  return null;
}

// Helper to determine color based on segment score
const getScoreColor = (score: number) => {
  if (score >= 75) return '#22c55e'; // Green
  if (score >= 50) return '#f97316'; // Orange/Yellow
  return '#ef4444'; // Red
};

const styleFunction = (feature: any) => {
  const status = feature?.properties?.confidence_status;
  if (status === 'blocked') {
    return {
      color: '#f97316',
      weight: 8,
      opacity: 0.9,
      dashArray: '10, 10'
    };
  }
  
  // Evaluate the overall composite score injected from activeRoute, fallback to computed_score
  const score = feature?.properties?.composite_score ?? feature?.properties?.computed_score ?? 100;
  return {
    color: getScoreColor(score),
    weight: 8,
    opacity: 0.8
  };
};

const onEachFeature = (feature: any, layer: any) => {
  if (feature.properties && feature.properties.name) {
    layer.bindTooltip(`
      <div class="p-1 font-sans">
        <p class="font-bold text-sm">${feature.properties.name}</p>
        <p class="text-xs">Safety Score: ${feature.properties.computed_score}/100</p>
      </div>
    `, { sticky: true });
  }
};

function MapEventsTracker() {
  const { setHoveredCoordinate, gisToolMode } = useTripStore();
  const { handleMapClick } = useGISTools();

  useMapEvents({
    mousemove(e) {
      if (!gisToolMode) {
        setHoveredCoordinate([e.latlng.lat, e.latlng.lng]);
      }
    },
    mouseout() {
      if (!gisToolMode) {
        setHoveredCoordinate(null);
      }
    },
    click(e) {
      if (gisToolMode) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

const TILE_LAYERS = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
};

export default function MapView() {
  const center: [number, number] = [27.95, 84.6]; // Center over highway
  const zoom = 9;

  const { departureHour, activeRoute, activeBaseMap, activeOverlays, gisResult, pois, activePoiCategory } = useTripStore();
  
  // Fetch admin overlays
  const { data: provinces } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      return (await axios.get(`${apiBase}/geodata/admin/provinces`)).data;
    },
    enabled: activeOverlays.provinces
  });

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      return (await axios.get(`${apiBase}/geodata/admin/districts`)).data;
    },
    enabled: activeOverlays.districts
  });

  const { data: localUnits } = useQuery({
    queryKey: ['localUnits'],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      return (await axios.get(`${apiBase}/geodata/admin/local`)).data;
    },
    enabled: activeOverlays.local
  });

  if (!activeRoute) return null;
  
  const geojson = activeRoute.geojson as FeatureCollection<LineString>;
  geojson.features.forEach((f: any) => {
    if (!f.properties) f.properties = {};
    f.properties.confidence_status = activeRoute.confidence?.status;
    f.properties.composite_score = activeRoute.composite_score;
  });

  return (
    <div className="h-screen w-screen relative font-sans">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        className={`h-full w-full z-0 ${useTripStore.getState().gisToolMode ? 'cursor-crosshair' : ''}`}
      >
        <TileLayer
          key={activeBaseMap}
          attribution='&copy; OpenStreetMap/ArcGIS contributors'
          url={TILE_LAYERS[activeBaseMap]}
        />

        {activeOverlays.provinces && provinces && (
          <GeoJSON 
            data={provinces} 
            style={{ color: '#4f46e5', weight: 3, fillOpacity: 0.1 }} 
            onEachFeature={(f, l) => l.bindTooltip(f.properties.name)}
          />
        )}

        {activeOverlays.districts && districts && (
          <GeoJSON 
            data={districts} 
            style={{ color: '#0ea5e9', weight: 1, fillOpacity: 0.05, dashArray: '5,5' }}
            onEachFeature={(f, l) => l.bindTooltip(f.properties.name)}
          />
        )}

        {activeOverlays.local && localUnits && (
          <GeoJSON 
            data={localUnits} 
            style={{ color: '#ec4899', weight: 0.5, fillOpacity: 0.02, dashArray: '2,4' }}
            onEachFeature={(f, l) => l.bindTooltip(f.properties.name + ' (' + f.properties.local_type + ')')}
          />
        )}

        {gisResult && (
          <GeoJSON
            key={JSON.stringify(gisResult.geojson)}
            data={gisResult.geojson}
            style={{ color: '#dc2626', weight: 4, fillColor: '#fca5a5', fillOpacity: 0.5 }}
          />
        )}

        <GeoJSON 
          key={departureHour + '_' + activeRoute.route_id + '_' + activeRoute.confidence.status} 
          data={geojson} 
          style={styleFunction}
          onEachFeature={onEachFeature}
        />
        
        {/* POI Layers: hazard_zones as Turf buffer polygons, others as circleMarkers */}
        {pois && (() => {
          const hazardFeatures = pois.features.filter((f: any) => f.properties?.category === 'hazard_zone');
          const regularFeatures = pois.features.filter((f: any) => f.properties?.category !== 'hazard_zone');

          // Build buffered polygon FeatureCollection for hazards (700m radius)
          const hazardBuffers = hazardFeatures.map((f: any) => {
            const buffered = turf.buffer(f, 0.7, { units: 'kilometers' });
            if (buffered) buffered.properties = f.properties;
            return buffered;
          }).filter(Boolean);

          const hazardFc = { type: 'FeatureCollection', features: hazardBuffers };
          const regularFc = { type: 'FeatureCollection', features: regularFeatures };

          return (
            <>
              {hazardBuffers.length > 0 && (
                <GeoJSON
                  key={'hazard_buffers_' + activePoiCategory}
                  data={hazardFc as any}
                  style={{
                    color: '#dc2626',
                    weight: 2,
                    fillColor: '#f97316',
                    fillOpacity: 0.25,
                    dashArray: '6, 4'
                  }}
                  onEachFeature={(f, l) => {
                    if (f.properties?.name) {
                      l.bindTooltip(
                        `<div class="font-sans px-1">
                          <div class="font-bold text-sm text-red-800">${f.properties.name}</div>
                          <div class="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-0.5">⚠ Hazard Zone</div>
                          <div class="text-[10px] text-slate-500 mt-0.5">${f.properties.description ?? ''}</div>
                        </div>`,
                        { direction: 'top', className: 'poi-tooltip' }
                      );
                    }
                  }}
                />
              )}

              {regularFeatures.length > 0 && (
                <GeoJSON
                  key={'regular_pois_' + activePoiCategory}
                  data={regularFc as any}
                  pointToLayer={(_, latlng) => {
                    return L.circleMarker(latlng, {
                      radius: 8,
                      fillColor: '#6366f1',
                      color: '#ffffff',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.9
                    });
                  }}
                  onEachFeature={(f, l) => {
                    if (f.properties?.name) {
                      l.bindTooltip(
                        `<div class="font-sans px-1">
                          <div class="font-bold text-sm text-slate-800">${f.properties.name}</div>
                          <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">${f.properties.category.replace('_', ' ')}</div>
                        </div>`,
                        { direction: 'top', className: 'poi-tooltip' }
                      );
                    }
                  }}
                />
              )}
            </>
          );
        })()}

        <MapEventsTracker />
        <MapRefCapture />
      </MapContainer>
    </div>
  );
}
