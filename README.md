# Rutam WebGIS

Rutam WebGIS is a dynamic routing and safety analysis platform designed for complex environments like the KTM-Pokhara route.

## Current Status: Academic Certification Ready
Rutam v3.0 has achieved core academic rubric compliance with full integration of spatial functionality, robust UI staging, and a complete crisis reporting loop.
- **Base Maps & Overlays**: 3 base maps, 3 administrative overlays (Provinces/Districts/Local Units).
- **Spatial Analysis (Turf.js)**: 3 functioning spatial tools (Distance measure, 700m Buffer polygons, Nearest POI logic).
- **POI Attribute Table**: An interactive POI table with shared filtering and click-to-locate (flyTo) functionality.
- **Search Capabilities**: Working semantic and location search.
- **Crisis Workflow**: A full crisis/blockage reporting flow with location picking, form submission, and real-time backend detour response handling.

## Recent Updates (v3.0)
- **UI Architecture**: Fully migrated to a Stage-Based UI workflow (`landing`/`routing`/`exploring`) with strict anti-congestion zones (SidePanel owns the right edge, GISToolbar owns the left edge, ExplorerDrawer owns the bottom).
- **Routing**: Migrated to a dynamic BRouter backend for accurate, road-aware navigation instead of static JSON mocks.
- **Safety Insights**: Implemented an async LLM pipeline, decoupling the safety advice from route calculation to allow for streaming checklist rendering in the frontend.
- **Database**: Configured PostGIS with 3D spatial indexing support for `NoNetworkZone` geometries and dynamic blockage detour insertion.
