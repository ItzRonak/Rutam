import * as turf from '@turf/turf';
import { useTripStore } from '../store/useTripStore';
import { useCallback } from 'react';
import axios from 'axios';

export function useGISTools() {
  const { 
    gisToolMode, 
    gisClickPoints, 
    bufferRadiusKm, 
    setGisResult, 
    addGisClickPoint
  } = useTripStore();

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!gisToolMode) return;

    if (gisToolMode === 'distance') {
      if (gisClickPoints.length === 0) {
        addGisClickPoint([lat, lng]);
      } else if (gisClickPoints.length === 1) {
        const pt1 = turf.point([gisClickPoints[0][1], gisClickPoints[0][0]]);
        const pt2 = turf.point([lng, lat]);
        const dist = turf.distance(pt1, pt2, { units: 'kilometers' });
        
        const line = turf.lineString([pt1.geometry.coordinates, pt2.geometry.coordinates]);
        
        setGisResult({
          type: 'distance',
          geojson: line,
          label: `${dist.toFixed(2)} km`
        });
        // We do not clear the tool automatically, so user can see it
      }
    } else if (gisToolMode === 'buffer') {
      const pt = turf.point([lng, lat]);
      const buffered = turf.buffer(pt, bufferRadiusKm, { units: 'kilometers' });
      
      setGisResult({
        type: 'buffer',
        geojson: buffered,
        label: `${bufferRadiusKm} km Buffer`
      });
      addGisClickPoint([lat, lng]); // store the center
    } else if (gisToolMode === 'nearest') {
      const targetPt = turf.point([lng, lat]);
      addGisClickPoint([lat, lng]);
      
      try {
        // Fetch safety POIs from the new endpoint
        const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
        const res = await axios.get(`${apiBase}/search/pois?category=all`);
        const fc = res.data as GeoJSON.FeatureCollection<GeoJSON.Point>;
        
        if (fc.features.length > 0) {
          const nearest = turf.nearestPoint(targetPt, fc);
          const line = turf.lineString([targetPt.geometry.coordinates, nearest.geometry.coordinates]);
          const dist = turf.distance(targetPt, nearest, { units: 'kilometers' });
          
          setGisResult({
            type: 'nearest',
            geojson: line, // Display a line connecting to nearest
            label: `Nearest: ${nearest.properties?.name} (${dist.toFixed(2)} km)`
          });
        }
      } catch (err) {
        console.error("Failed to find nearest POI:", err);
      }
    }
  }, [gisToolMode, gisClickPoints, bufferRadiusKm, setGisResult, addGisClickPoint]);

  return { handleMapClick };
}
