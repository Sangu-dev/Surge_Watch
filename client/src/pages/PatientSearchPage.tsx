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
  AlertCircle,
  Info,
  ShieldAlert,
  Radio,
  Globe2,
  Navigation,
  CheckCircle2,
  Truck,
  X
} from 'lucide-react';
import { dispatchEmergencyAmbulance, releaseEmergencyAmbulance } from '../services/api';

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

  // SOS Ambulance Dispatch State
  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);
  const [targetHospitalForSos, setTargetHospitalForSos] = useState<Hospital | null>(null);
  const [emergencyType, setEmergencyType] = useState<string>('TRAUMA_ACCIDENT');
  const [patientName, setPatientName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [activeDispatch, setActiveDispatch] = useState<any | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

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
    service: filterFacility,
    sortBy,
  });

  // Open SOS Ambulance Dispatch Drawer / Dialog
  const handleOpenAmbulanceRequest = (hospital?: Hospital) => {
    setTargetHospitalForSos(hospital || null);
    setDispatchError(null);
    setSosModalOpen(true);
  };

  // Submit Ambulance Dispatch
  const handleConfirmDispatch = async () => {
    setDispatchLoading(true);
    setDispatchError(null);
    try {
      const res = await dispatchEmergencyAmbulance({
        hospitalId: targetHospitalForSos?.id,
        patientName: patientName.trim() || 'Emergency Patient',
        contactPhone: contactPhone.trim() || '+91 99000 12345',
        emergencyType,
        severity: 'CRITICAL',
        latitude: location.lat,
        longitude: location.lng,
        pickupAddress: location.label,
        dispatchNotes: dispatchNotes.trim() || 'Immediate casualty transfer requested via SurgeWatch BLR',
      });
      setActiveDispatch(res);
      refetch();
    } catch (e: any) {
      setDispatchError(e.message || 'Failed to dispatch ambulance.');
    } finally {
      setDispatchLoading(false);
    }
  };

  // Release Emergency Ambulance back to AVAILABLE
  const handleReleaseDispatch = async () => {
    if (!activeDispatch?.emergencyRequest?.id) {
      setActiveDispatch(null);
      setSosModalOpen(false);
      return;
    }
    setDispatchLoading(true);
    try {
      await releaseEmergencyAmbulance(activeDispatch.emergencyRequest.id);
      setActiveDispatch(null);
      setSosModalOpen(false);
      refetch();
    } catch (e: any) {
      console.warn('Failed to release ambulance:', e);
      setActiveDispatch(null);
      setSosModalOpen(false);
    } finally {
      setDispatchLoading(false);
    }
  };

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
            <button
              type="button"
              onClick={() => handleOpenAmbulanceRequest()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Request Ambulance</span>
            </button>
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
                Detect your live location or pick an accident spot to discover all available hospitals within your selected radius.
              </p>
            </div>

            {/* GPS & Live Tracking Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={acquireGpsLocation}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Compass className={`w-4 h-4 text-sky-400 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Acquiring Satellite GPS...' : 'Use Precise GPS'}</span>
              </button>

              <button
                type="button"
                onClick={isTrackingLive ? stopLiveTracking : startLiveTracking}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isTrackingLive
                    ? 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <Radio className={`w-4 h-4 ${isTrackingLive ? 'text-red-600' : 'text-slate-500'}`} />
                <span>{isTrackingLive ? 'Live Tracking Active' : 'Start Live GPS Track'}</span>
              </button>
            </div>
          </div>

          {/* Search by Neighborhood */}
          <form onSubmit={handleManualSearch} className="flex gap-2">
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

        {/* OpenStreetMap & Straight-line Distance Disclosure */}
        <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 text-xs text-sky-950 flex items-start gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="font-bold text-sky-900 block">OpenStreetMap Facility Discovery</strong>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              Hospital data retrieved from OpenStreetMap contributors. Facility records may be incomplete or outdated. Distances are straight-line measurements. Click "Directions" on any hospital for live driving navigation.
            </p>
          </div>
        </div>

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
              { id: 'ER', label: 'ER Beds Available' },
              { id: 'DOCTORS', label: 'Doctors on Duty' },
              { id: 'NURSES', label: 'Nurses on Duty' },
              { id: 'AMBULANCE', label: 'Ambulances Ready' },
              { id: 'TRAUMA', label: 'Level 1 Trauma' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterFacility(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors ${
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
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="distance">Shortest Distance (Aerial)</option>
              <option value="beds">Most Available Beds</option>
              <option value="ambulances">Most Ready Ambulances</option>
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
                {searchRadius} km Perimeter Circle
              </span>
            </div>

            <MapPreview
              accidentLocation={location}
              radiusKm={searchRadius}
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
                <span className="font-bold text-sm">
                  {filteredHospitals.length} Matching {filteredHospitals.length === 1 ? 'Hospital' : 'Hospitals'} within {searchRadius} km
                </span>
              </div>
              <span className="text-slate-300 text-[11px]">
                {sortBy === 'distance' ? 'Nearest to Farthest' : sortBy === 'beds' ? 'Most Available Beds First' : 'Most Ready Ambulances First'}
                {filterFacility !== 'ALL' && ` · Filter: ${[
                  { id: 'ICU', label: 'ICU Available' },
                  { id: 'ER', label: 'ER Beds' },
                  { id: 'DOCTORS', label: 'Doctors on Duty' },
                  { id: 'NURSES', label: 'Nurses on Duty' },
                  { id: 'AMBULANCE', label: 'Ambulances Ready' },
                  { id: 'TRAUMA', label: 'Level 1 Trauma' },
                ].find(f => f.id === filterFacility)?.label}`}
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
                  Try expanding the search radius to 10 km or 15 km, or selecting another accident coordinate in Bengaluru.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  {searchRadius < 10 && (
                    <button
                      type="button"
                      onClick={() => setSearchRadius(10)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Expand to 10 km
                    </button>
                  )}
                  {searchRadius < 15 && (
                    <button
                      type="button"
                      onClick={() => setSearchRadius(15)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Expand to 15 km
                    </button>
                  )}
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
                    onRequestAmbulance={handleOpenAmbulanceRequest}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Hospital Detail Modal */}
      <HospitalDetailModal
        hospital={selectedHospital}
        onClose={() => setSelectedHospital(null)}
        onRequestAmbulance={handleOpenAmbulanceRequest}
      />

      {/* Emergency Ambulance SOS Dispatch Dialog */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Dialog Header */}
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Emergency Ambulance Dispatch</h3>
                  <p className="text-xs text-slate-400">
                    {targetHospitalForSos ? `From ${targetHospitalForSos.name}` : 'From Nearest Available Facility'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSosModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Mandatory Safety Notice */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Important Demonstration Disclaimer</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  SurgeWatch records internal software assignments for system demonstration. This does <strong>not</strong> dispatch real municipal vehicles or connect to 108/GVK EMRI government emergency services. For verified life-threatening emergencies, dial <strong>112</strong> or <strong>108</strong> immediately.
                </p>
              </div>

              {activeDispatch ? (
                /* Active Dispatch Status View */
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      Status: {activeDispatch.assignedAmbulance?.status || 'ASSIGNED'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      #{activeDispatch.emergencyRequest?.id?.slice(0, 8)}
                    </span>
                  </div>

                  {activeDispatch.assignedAmbulance ? (
                    <div className="bg-white rounded-lg p-3 border border-emerald-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">Assigned Vehicle:</span>
                        <span className="font-mono font-extrabold text-slate-900 text-sm">
                          {activeDispatch.assignedAmbulance.registrationPlate}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">Ambulance Type:</span>
                        <span className="font-bold text-slate-800">
                          {activeDispatch.assignedAmbulance.ambulanceType}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">Station / Location:</span>
                        <span className="text-slate-700">
                          {activeDispatch.assignedAmbulance.currentLocation || 'Hospital Station Base'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800">
                      Emergency request registered. No ambulance currently available at selected facility.
                    </p>
                  )}

                  <div className="text-xs text-slate-600">
                    <span className="font-semibold">Accident Pickup Location:</span> {location.label}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleReleaseDispatch}
                      disabled={dispatchLoading}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {dispatchLoading ? 'Releasing Vehicle...' : 'Complete & Release Ambulance back to AVAILABLE'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Dispatch Form */
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Accident Location</label>
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 flex items-center justify-between">
                      <span className="truncate">{location.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">[{location.lat.toFixed(4)}, {location.lng.toFixed(4)}]</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Emergency Casualty Type</label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="TRAUMA_ACCIDENT">Road Traffic Accident (RTA) / Trauma</option>
                      <option value="CARDIAC">Acute Cardiac Arrest / Chest Pain</option>
                      <option value="STROKE">Stroke / Neurological Triage</option>
                      <option value="RESPIRATORY">Severe Acute Respiratory Distress</option>
                      <option value="GENERAL">General Medical Emergency</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Patient Name</label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Unknown Pedestrian"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 99000 12345"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Triage Casualty Notes</label>
                    <textarea
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Multiple injuries reported near Silk Board flyover ramp..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900 text-xs"
                    />
                  </div>

                  {dispatchError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{dispatchError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSosModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDispatch}
                      disabled={dispatchLoading}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {dispatchLoading ? 'Assigning Vehicle...' : 'Confirm Ambulance Assignment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
