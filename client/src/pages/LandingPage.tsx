import { useState } from 'react';
import type { FC } from 'react';
import {
  Activity,
  MapPin,
  Compass,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Search,
  Building2,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { BENGALURU_LANDMARKS } from '../data/mockHospitals';
import type { Hospital, LandmarkPreset } from '../types';
import { HospitalCard } from '../components/HospitalCard';
import { RadiusSelector } from '../components/RadiusSelector';
import { MapPreview } from '../components/MapPreview';
import { HospitalDetailModal } from '../components/HospitalDetailModal';
import { HospitalSkeleton } from '../components/HospitalSkeleton';
import { useHospitalSearch } from '../hooks/useHospitalSearch';

import { useDeviceLocation } from '../hooks/useDeviceLocation';

interface LandingPageProps {
  onNavigateToPatientLogin: () => void;
  onNavigateToAdminLogin: () => void;
}

export const LandingPage: FC<LandingPageProps> = ({
  onNavigateToPatientLogin,
  onNavigateToAdminLogin,
}) => {
  // 4-tier Device Location & Fallback Hook
  const {
    location,
    gpsLoading,
    gpsError,
    acquireGpsLocation,
    selectManualLocation,
  } = useDeviceLocation();

  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [filterFacility, setFilterFacility] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'beds' | 'ambulances'>('distance');
  const [manualQuery, setManualQuery] = useState<string>('');

  // Landmark Preset Selection
  const handleSelectLandmark = (preset: LandmarkPreset) => {
    selectManualLocation(preset.latitude, preset.longitude, `${preset.name} (${preset.area})`);
  };

  // Manual search submit
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    const match = BENGALURU_LANDMARKS.find((l) =>
      l.name.toLowerCase().includes(manualQuery.toLowerCase()) ||
      l.area.toLowerCase().includes(manualQuery.toLowerCase())
    );

    if (match) {
      handleSelectLandmark(match);
      setManualQuery('');
    } else {
      selectManualLocation(location.lat, location.lng, `Near "${manualQuery.trim()}" (Bengaluru)`);
      setManualQuery('');
    }
  };

  // Interactive map click handler to move accident pin
  const handleMapClick = (lat: number, lng: number) => {
    selectManualLocation(lat, lng);
  };

  // Live Hospital Search Hook (Queries OpenStreetMap + Live Registry)
  const {
    hospitals: filteredHospitals,
    metadata: searchMetadata,
    loading: hospitalsLoading,
    error: hospitalsError,
    isBackendConnected,
    realtimeNotification,
    refetch,
  } = useHospitalSearch({
    lat: location.lat,
    lng: location.lng,
    radius: searchRadius,
    limit: 5,
    service: filterFacility,
    sortBy,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-800">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-sky-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-24 right-0 w-96 h-96 bg-red-500/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Live City Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bengaluru Emergency Discovery Network</span>
              <span className="text-slate-500">•</span>
              <span className="text-sky-400">Live Radius Search</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Seconds Count. Discover Verified{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
                Emergency Hospital Beds
              </span>{' '}
              Nearby.
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Pin an accident or trauma location anywhere in Bengaluru. Compare verified emergency ICU beds, on-duty trauma physicians, ambulance readiness, and transit times within <strong className="text-white">5, 10, 15, or 20 km</strong>.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="#search-section"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 active:scale-98 transition-all"
              >
                <Search className="w-4 h-4" />
                <span>Find Nearby Hospitals</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                onClick={onNavigateToAdminLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-semibold shadow-sm transition-all"
              >
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Hospital Administrator Login</span>
              </button>
            </div>
          </div>

          {/* Location Selection Command Bar */}
          <div className="mt-12 max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex flex-col gap-3">
              {/* Form Input + GPS Trigger */}
              <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="Enter accident location, street, or landmark in Bengaluru..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={acquireGpsLocation}
                    disabled={gpsLoading}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Detect current location using browser GPS"
                  >
                    <Compass className={`w-4 h-4 text-sky-600 ${gpsLoading ? 'animate-spin' : ''}`} />
                    <span>{gpsLoading ? 'Detecting GPS...' : 'Use My GPS'}</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                  >
                    Set Location
                  </button>
                </div>
              </form>

              {/* Active Accident Location Display */}
              <div className="flex items-center justify-between text-xs bg-slate-100/90 rounded-lg px-3 py-2 border border-slate-200/80 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                  <span className="font-semibold text-slate-600">Active Search Pin:</span>
                  <strong className="text-slate-900 font-bold">{location.label}</strong>
                </div>
                <span className="text-[11px] text-slate-500">
                  [{location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E]
                </span>
              </div>

              {gpsError && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              {/* One-Click Bengaluru Landmark Chips */}
              <div className="pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Or pick a common Bengaluru emergency landmark:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {BENGALURU_LANDMARKS.map((preset) => {
                    const isSelected = location.label.includes(preset.name);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectLandmark(preset)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {preset.name.split('/')[0].trim()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE HOSPITAL DISCOVERY SEARCH SECTION */}
      <section id="search-section" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        {/* Section Heading & Radius Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
              <Compass className="w-4 h-4" />
              <span>Real-Time Discovery Matrix</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Nearby Hospitals Around Accident Location
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Distances calculated via Geodesic Haversine math. Aerial distance is distinct from estimated road transit.
            </p>
          </div>

          <div className="w-full md:w-auto md:min-w-[360px]">
            <RadiusSelector
              selectedRadius={searchRadius}
              onChangeRadius={setSearchRadius}
              hospitalCount={filteredHospitals.length}
            />
          </div>
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
          {/* Facility Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Emergency Facilities' },
              { id: 'ICU', label: 'ICU Available' },
              { id: 'TRAUMA', label: 'Level 1 Trauma' },
              { id: 'AMBULANCE', label: 'Ambulances Ready' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterFacility(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterFacility === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 justify-end">
            <span className="font-bold text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-sky-500"
            >
              <option value="distance">Shortest Distance (Aerial)</option>
              <option value="beds">Most Available Beds</option>
              <option value="ambulances">Most Ready Ambulances</option>
            </select>
          </div>
        </div>

        {/* Search Expansion Notification Banner */}
        {searchMetadata?.wasExpanded && (
          <div className="bg-sky-50 border border-sky-300 rounded-2xl p-4 text-xs text-sky-950 flex items-start gap-3 shadow-xs">
            <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold text-sky-900 block text-sm">
                Search Radius Automatically Expanded
              </strong>
              <p className="leading-relaxed text-sky-800">
                {searchMetadata.expansionMessage}
              </p>
            </div>
          </div>
        )}

        {/* Map + Hospital List Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Top: Interactive Map Preview */}
          <div className="lg:col-span-5 space-y-3 sticky top-24">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
              <span>Interactive Leaflet Map Preview</span>
              <span className="text-sky-600">{searchRadius} km Perimeter Ring</span>
            </div>
            <MapPreview
              accidentLocation={location}
              radiusKm={searchRadius}
              hospitals={filteredHospitals}
              onSelectHospital={setSelectedHospital}
              onMapClick={handleMapClick}
            />
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p>
                Click any hospital marker or click anywhere on the map to re-center the search perimeter around that coordinate.
              </p>
            </div>
          </div>

          {/* Right / Bottom: Hospital Cards Grid */}
          <div className="lg:col-span-7 space-y-4">
            {/* Live Data Connectivity Badge */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Data Source:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isBackendConnected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBackendConnected ? 'bg-emerald-500 animate-ping' : 'bg-sky-500'
                    }`}
                  />
                  {isBackendConnected ? 'Live SQLite Backend' : 'Client Spatial Math'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-slate-500 hover:text-slate-800 hover:underline font-semibold cursor-pointer"
              >
                Refresh Capacity
              </button>
            </div>

            {/* Real-time broadcast pulse banner */}
            {realtimeNotification && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>{realtimeNotification}</span>
              </div>
            )}

            {hospitalsLoading ? (
              <div className="space-y-4">
                <HospitalSkeleton />
                <HospitalSkeleton />
              </div>
            ) : hospitalsError ? (
              <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">Failed to Retrieve Capacity Data</h3>
                <p className="text-xs text-slate-500">{hospitalsError}</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  Retry Search
                </button>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Hospitals Found Within {searchRadius} km</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try expanding the search radius to 15 km or 20 km, or clearing specific facility filters to locate the closest available emergency centres.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchRadius(15)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                  >
                    Expand to 15 km
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchRadius(20)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                  >
                    Expand to 20 km
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHospitals.map((hosp, idx) => (
                  <HospitalCard
                    key={hosp.id}
                    hospital={hosp}
                    rank={idx + 1}
                    onViewDetails={setSelectedHospital}
                    onFocusOnMap={setSelectedHospital}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. EXPLANATION: WHY RADIUS MATTERS (5, 10, 15, 20 KM) */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tiered Radius Discovery in High-Density Urban Environments
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Why SurgeWatch provides 5 km, 10 km, 15 km, and 20 km selection during accidents and critical episodes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-sm">
                5 km
              </div>
              <h3 className="font-bold text-slate-900 text-base">Immediate Golden Hour Triage</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Critical for severe hemorrhages, cardiac arrest, and airway obstructions where travel time must remain under 10–15 minutes.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-extrabold flex items-center justify-center text-sm">
                10 km
              </div>
              <h3 className="font-bold text-slate-900 text-base">Urban Corridor Routing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Expands discovery to major peripheral tertiary hospitals when immediate local primary emergency wards report zero available ICU beds.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-sm">
                15 km
              </div>
              <h3 className="font-bold text-slate-900 text-base">Specialized Facility Search</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enables locating specialized tertiary units such as dedicated burn wards, interventional stroke centers, or pediatric intensive care.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center text-sm">
                20 km
              </div>
              <h3 className="font-bold text-slate-900 text-base">Greater Bengaluru Reach</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connects peri-urban highways (e.g., Electronic City elevated expressway, Airport Road) to advanced medical campuses across town.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW SURGEWATCH WORKS (3 SIMPLE EMERGENCY STEPS) */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Simple 3-Step Flow</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed for Speed Under Severe Stress
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              When an accident occurs, bystanders and responders need clear direction without friction or sign-up roadblocks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 relative">
              <span className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center">
                1
              </span>
              <h3 className="text-lg font-bold text-slate-900">Pin Accident Location</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Use your smartphone GPS with one tap or choose a common Bengaluru landmark. No account registration required.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>One-click browser GPS accuracy</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Interactive map pin placement</span>
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 relative">
              <span className="w-10 h-10 rounded-xl bg-sky-600 text-white font-extrabold text-lg flex items-center justify-center">
                2
              </span>
              <h3 className="text-lg font-bold text-slate-900">Verify Real-Time Capacity</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review available ICU beds, on-duty trauma physicians, and data freshness timestamps reported by verified administrators.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Live vs. Stale data warning indicator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Straight-line aerial vs. road transit</span>
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 relative">
              <span className="w-10 h-10 rounded-xl bg-red-600 text-white font-extrabold text-lg flex items-center justify-center">
                3
              </span>
              <h3 className="text-lg font-bold text-slate-900">Pre-Alert Triage & Navigate</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Directly dial the hospital's emergency room triage desk to alert incoming staff while routing via turn-by-turn navigation.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Direct 24/7 casualty phone dialer</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Instant Google Maps navigation link</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. USER ENTRY POINTS: PATIENT VS. HOSPITAL ADMINISTRATOR */}
      <section id="admin-section" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dual Entry Points</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Built for Both Responders & Healthcare Administrators
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Patient & Bystander Card */}
            <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">For Patients, Bystanders & Responders</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Fast, frictionless emergency discovery designed to function effortlessly on any mobile device. Zero required account sign-up before you can discover life-saving hospital facilities.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Instant guest search within 5, 10, 15, 20 km</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>One-click direct phone triage call</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Optional patient account to save favorite routes</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onNavigateToPatientLogin}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                <span>Patient Sign In / Registration</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Hospital Administrator Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">For Hospital Administrators & Duty Officers</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Authorized medical personnel can update emergency ICU beds, occupied counts, doctor shift metrics, and ambulance readiness with cryptographic role-based security.
                </p>
                <ul className="text-xs text-slate-300 space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Single-click bed and doctor capacity updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Automatic stale data alerts and warnings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Strict audit trail logging author, time, and IP</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onNavigateToAdminLogin}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                <span>Hospital Administrator Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRUST, DATA FRESHNESS & VERIFICATION GUARANTEE */}
      <section id="data-freshness" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Accountability</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Data Freshness & Transparency Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              In medical emergencies, outdated capacity data can be dangerous. SurgeWatch enforces strict freshness indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-slate-900 text-sm">Verified Live (&lt; 30 Mins)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hospital administrators have confirmed or updated capacity within the last 30 minutes. Highest confidence for immediate patient dispatch.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-sky-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <h3 className="font-bold text-slate-900 text-sm">Recent (30 Mins – 2 Hours)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Availability was reported during the current shift. Responders are advised to verify bed reservation via the direct emergency call button.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Stale (&gt; 2 Hours Overdue)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Triggers an amber alert banner notifying users that updates are overdue. Never presented as confirmed live availability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. EMERGENCY SAFETY DISCLAIMER */}
      <section id="safety" className="py-12 bg-rose-50/70 border-t border-rose-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Emergency Safety & Legal Disclaimer</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">SurgeWatch is an Information & Discovery Network</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            SurgeWatch does not guarantee bed admission, faster treatment, or medical outcomes. Hospital bed capacity changes constantly. In critical life-threatening situations, always dial national emergency services at <strong className="text-red-700">112</strong> or ambulance dispatch at <strong className="text-red-700">108</strong> immediately.
          </p>
        </div>
      </section>

      {/* Hospital Detail Modal */}
      <HospitalDetailModal
        hospital={selectedHospital}
        onClose={() => setSelectedHospital(null)}
      />
    </div>
  );
};
