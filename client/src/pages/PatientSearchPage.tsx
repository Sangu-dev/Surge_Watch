import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BENGALURU_LANDMARKS } from '../data/mockHospitals';
import type { Hospital, LandmarkPreset } from '../types';
import { HospitalCard } from '../components/HospitalCard';
import { RadiusSelector } from '../components/RadiusSelector';
import { MapPreview } from '../components/MapPreview';
import { HospitalDetailModal } from '../components/HospitalDetailModal';
import { HospitalSkeleton } from '../components/HospitalSkeleton';
import { useHospitalSearch } from '../hooks/useHospitalSearch';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import {
  Activity,
  MapPin,
  Compass,
  ArrowLeft,
  SlidersHorizontal,
  AlertTriangle,
  Info,
  ShieldAlert,
  RefreshCw,
  Radio,
  Globe2,
  Navigation,
  CheckCircle2
} from 'lucide-react';

export const PatientSearchPage: FC = () => {
  // 4-tier Device Location & Fallback Hook
  const {
    location,
    gpsLoading,
    gpsError,
    isTrackingLive,
    acquireGpsLocation,
    startLiveTracking,
    stopLiveTracking,
    fallbackToIp,
    selectManualLocation,
    refreshLocation,
  } = useDeviceLocation();

  const [searchRadius, setSearchRadius] = useState<number>(5); // Starts at recommended 5 km radius
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [filterFacility, setFilterFacility] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'beds' | 'ambulances'>('distance');
  const [manualQuery, setManualQuery] = useState<string>('');

  const handleSelectLandmark = (preset: LandmarkPreset) => {
    selectManualLocation(preset.latitude, preset.longitude, `${preset.name} (${preset.area})`);
  };

  const handleManualSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    const match = BENGALURU_LANDMARKS.find(
      (l) =>
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

  // Map click or pin drag handler
  const handleMapClick = (lat: number, lng: number) => {
    selectManualLocation(lat, lng);
  };

  // Focus map on a specific hospital
  const handleFocusOnMap = (hospital: Hospital) => {
    setSelectedHospital(hospital);
  };

  // Live Real Hospital Search Hook (OpenStreetMap Overpass + Local Database)
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
    limit: 5, // Strictly nearest 5 hospitals
    service: filterFacility,
    sortBy,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16">
      {/* Top Navbar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Return to Landing Page"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center font-bold shadow-xs">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Surge<span className="text-sky-600">Watch</span> BLR
                </span>
                <span className="text-[10px] block font-semibold text-slate-500 uppercase tracking-wider">
                  Emergency Hospital Discovery
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Call 112 Dispatch</span>
            </a>
            <Link
              to="/admin/login"
              className="hidden sm:inline-block text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Hospital Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Search Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full">
        {/* Location Picker & GPS Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Accident Location & Device GPS</h2>
              <p className="text-xs text-slate-500">
                Detect your live location or select the accident spot across Bengaluru to find the nearest 5 hospitals.
              </p>
            </div>

            {/* GPS & Live Tracking Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={acquireGpsLocation}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                title="Acquire exact current coordinates using device GPS"
              >
                <Compass className={`w-4 h-4 text-sky-600 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Detecting GPS...' : 'Use My Current Location'}</span>
              </button>

              <button
                type="button"
                onClick={refreshLocation}
                disabled={gpsLoading}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Refresh location coordinates"
              >
                <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Continuous Live Tracking Toggle */}
              <button
                type="button"
                onClick={isTrackingLive ? stopLiveTracking : startLiveTracking}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  isTrackingLive
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Continuously track moving position during an active emergency"
              >
                <Radio className={`w-4 h-4 ${isTrackingLive ? 'animate-pulse text-white' : 'text-slate-500'}`} />
                <span>{isTrackingLive ? 'Tracking Active (Stop)' : 'Live Emergency GPS Tracking'}</span>
              </button>
            </div>
          </div>

          {/* Manual Query Input */}
          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search accident location or neighborhood (e.g., Whitefield, Hebbal, Indiranagar, Electronic City)..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors"
            >
              Search Location
            </button>
          </form>

          {/* Active Location Source Tag & Accuracy */}
          <div className="flex items-center justify-between text-xs bg-slate-50 rounded-xl p-3 border border-slate-200 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {location.source === 'GPS_ACCURATE' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Real Device GPS Accurate {location.accuracyMeters ? `(±${location.accuracyMeters}m)` : ''}
                </span>
              ) : location.source === 'IP_APPROXIMATE' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-amber-100 text-amber-900 border border-amber-300">
                  <Globe2 className="w-3 h-3 text-amber-700" />
                  Approximate IP Location (Not GPS Accurate)
                </span>
              ) : location.source === 'CACHED_LOCATION' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-200 text-slate-800 border border-slate-300">
                  Cached Session Location
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-sky-100 text-sky-800 border border-sky-300">
                  <Navigation className="w-3 h-3 text-sky-600" />
                  Manually Selected Accident Location
                </span>
              )}

              <strong className="text-slate-900 font-bold">{location.label}</strong>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>[{location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E]</span>
              {location.source === 'CACHED_LOCATION' && (
                <button
                  type="button"
                  onClick={refreshLocation}
                  className="text-sky-600 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Refresh Now
                </button>
              )}
            </div>
          </div>

          {/* GPS Error & Fallback Banner */}
          {gpsError && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{gpsError}</span>
              </div>
              <button
                type="button"
                onClick={fallbackToIp}
                className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs cursor-pointer flex-shrink-0"
              >
                Use Approximate IP Fallback
              </button>
            </div>
          )}

          {/* Quick Landmark Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Bengaluru Junctions:</span>
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

        {/* Radius Selector */}
        <RadiusSelector
          selectedRadius={searchRadius}
          onChangeRadius={setSearchRadius}
          hospitalCount={filteredHospitals.length}
        />

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

        {/* Facility Filter & Sort Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Emergency' },
              { id: 'ICU', label: 'ICU Available' },
              { id: 'TRAUMA', label: 'Level 1 Trauma' },
              { id: 'AMBULANCE', label: 'Ambulances Ready' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterFacility(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer ${
                  filterFacility === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <span className="font-bold text-slate-500">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="distance">Shortest Aerial Distance (Nearest First)</option>
              <option value="beds">Available Beds</option>
              <option value="ambulances">Ready Ambulances</option>
            </select>
          </div>
        </div>

        {/* Map + List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Preview Column */}
          <div className="lg:col-span-5 space-y-3 sticky top-24">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
              <span>Interactive Map View</span>
              <span className="text-sky-600 font-bold">
                {searchMetadata?.effectiveRadiusKm || searchRadius} km Perimeter
              </span>
            </div>

            <MapPreview
              accidentLocation={location}
              radiusKm={searchMetadata?.effectiveRadiusKm || searchRadius}
              hospitals={filteredHospitals}
              isTrackingLive={isTrackingLive}
              onSelectHospital={setSelectedHospital}
              onMapClick={handleMapClick}
            />

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p>
                Click anywhere on the map or drag the <strong className="text-red-600">Red Pin</strong> to search around an exact accident spot elsewhere in Bengaluru.
              </p>
            </div>
          </div>

          {/* Hospital Cards Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Live Data Connectivity Badge */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Discovery Engine:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
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
                  {searchMetadata?.dataSource || (isBackendConnected ? 'OpenStreetMap Live Discovery' : 'Offline Geodesic Mode')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                className="text-slate-500 hover:text-slate-800 hover:underline font-semibold cursor-pointer"
              >
                Refresh Results
              </button>
            </div>

            {/* Real-time broadcast pulse banner */}
            {realtimeNotification && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>{realtimeNotification}</span>
              </div>
            )}

            {/* Results Header */}
            <div className="bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold">
                  Top {filteredHospitals.length} Nearest Hospital Recommendations
                </span>
              </div>
              <span className="text-slate-300">
                Sorted by Proximity
              </span>
            </div>

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
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Retry Search
                </button>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">
                  No Hospitals Found Within {searchRadius} km
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try expanding the search radius to 10 km, 15 km, or 25 km, or selecting another accident coordinate in Bengaluru.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchRadius(10)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Expand to 10 km
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchRadius(15)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Expand to 15 km
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
                    onFocusOnMap={handleFocusOnMap}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <HospitalDetailModal
        hospital={selectedHospital}
        onClose={() => setSelectedHospital(null)}
      />
    </div>
  );
};
