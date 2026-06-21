import axios from 'axios';
import type { FeatureCollection, LineString } from 'geojson';
import type { TripRequest, ScoredRoute } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

export const fetchMockRoute = async (): Promise<FeatureCollection<LineString>> => {
  const response = await api.get('/routes/ktm-pokhara');
  return response.data;
};

export const scoreRoute = async (request: TripRequest): Promise<ScoredRoute> => {
  const response = await api.post('/routes/score-route', request);
  return response.data;
};
