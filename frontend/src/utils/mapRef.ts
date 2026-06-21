import type { Map as LeafletMap } from 'leaflet';

// Module-level mutable ref: stores the live Leaflet Map instance.
// Not in Zustand — Leaflet Map objects are not serializable.
// Set by MapRefCapture (inside MapContainer), read by ExplorerDrawer.
export const mapRef: { current: LeafletMap | null } = { current: null };
