import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { ScoredRoute } from '../types';
import { useTripStore } from '../store/useTripStore';

export const useChecklist = (route: ScoredRoute | null) => {
  const setChecklistData = useTripStore((state) => state.setChecklistData);
  const isOffline = useTripStore((state) => state.isOffline);
  const cachedChecklistData = useTripStore((state) => state.checklistData);

  return useQuery({
    queryKey: ['checklist', route?.route_id],
    queryFn: async () => {
      if (isOffline && cachedChecklistData) {
        return cachedChecklistData;
      }
      if (!route) throw new Error('No route provided');
      // Use the checklist endpoint to get the LLM advice
      const response = await axios.post('http://localhost:8000/api/v1/checklist', route);
      const data = response.data;
      setChecklistData(data);
      return data;
    },
    enabled: (!!route && !!route.route_id) || (isOffline && !!cachedChecklistData),
  });
};
