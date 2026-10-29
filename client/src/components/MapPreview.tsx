import { useEffect, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Hospital, LocationState } from '../types';

// Environment-driven map configuration
const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY || '';
const CUSTOM_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || '';

function getTileLayerUrl(): string {
  if (CUSTOM_TILE_URL) {
    return CUSTOM_TILE_URL.replace('{apiKey}', MAPS_API_KEY).replace('{key}', MAPS_API_KEY);
  }
  if (MAPS_API_KEY) {
    return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(MAPS_API_KEY)}`;
  }
  return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
}

// Fix for default Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Emergency Pin with live tracking state
function createAccidentIcon(isLiveTracking: boolean = false) {
  return new L.DivIcon({
    className: 'custom-accident-pin',
    html: `<div style="
      width: 28px;
      height: 28px;
      background: #DC2626;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 18px rgba(220, 38, 38, 0.95);
      position: relative;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        top: -8px;
        left: -8px;
        width: 44px;
        height: 44px;
        border: 2px solid ${isLiveTracking ? '#10B981' : '#DC2626'};
        border-radius: 50%;
        animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      ${isLiveTracking ? '<div style="width: 8px; height: 8px; background: #FFFFFF; border-radius: 50%;"></div>' : ''}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Custom Numbered Hospital Pins (#1, #2, #3, ...)
function createHospitalIcon(rank: number) {
  const isTopThree = rank <= 3;
  const bg = isTopThree ? '#0F172A' : '#1E293B';
  const border = isTopThree ? '#38BDF8' : '#94A3B8';
  const text = isTopThree ? '#38BDF8' : '#F8FAFC';

  return new L.DivIcon({
    className: `custom-hospital-pin-${rank}`,
    html: `<div style="
      width: 32px;
      height: 32px;
      background: ${bg};
      border: 2px solid ${border};
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${text};
      font-weight: 800;
      font-size: 13px;
      font-family: sans-serif;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
      cursor: pointer;
    ">
      ${rank}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

const MapController: FC<MapControllerProps> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
};

interface MapEventsHandlerProps {
  onMapClick?: (lat: number, lng: number) => void;
}

const MapEventsHandler: FC<MapEventsHandlerProps> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

interface MapPreviewProps {
  accidentLocation: LocationState | { lat: number; lng: number; label: string; accuracyMeters?: number };
  radiusKm: number;
  hospitals: Hospital[];
  isTrackingLive?: boolean;
  onSelectHospital?: (hospital: Hospital) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export const MapPreview: FC<MapPreviewProps> = ({
  accidentLocation,
  radiusKm,
  hospitals,
  isTrackingLive = false,
  onSelectHospital,
  onMapClick,
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  const getZoom = (radius: number) => {
    if (radius <= 5) return 13;
    if (radius <= 10) return 12;
    if (radius <= 15) return 11;
    return 10;
  };

  const center: [number, number] = [accidentLocation.lat, accidentLocation.lng];
  const accidentIcon = useMemo(() => createAccidentIcon(isTrackingLive), [isTrackingLive]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && onMapClick) {
          const latLng = marker.getLatLng();
          onMapClick(latLng.lat, latLng.lng);
        }
      },
    }),
    [onMapClick]
  );

  return (
    <div className="w-full h-80 sm:h-[440px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative z-0">
      <MapContainer
        center={center}
        zoom={getZoom(radiusKm)}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <MapController center={center} zoom={getZoom(radiusKm)} />
        <MapEventsHandler onMapClick={onMapClick} />

        {/* Basemap Tiles with API Key Integration */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={getTileLayerUrl()}
          maxZoom={19}
        />

        {/* Search Radius Perimeter Ring */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '6, 6',
          }}
        />

        {/* Reported GPS Accuracy Circle (if available) */}
        {accidentLocation.accuracyMeters && accidentLocation.accuracyMeters > 0 && accidentLocation.accuracyMeters < 3000 && (
          <Circle
            center={center}
            radius={accidentLocation.accuracyMeters}
            pathOptions={{
              color: '#10b981',
              fillColor: '#34d399',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        )}

        {/* Draggable Accident Location Pin */}
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={center}
          ref={markerRef}
          icon={accidentIcon}
        >
          <Popup className="font-sans">
            <div className="p-1 max-w-[200px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                <strong className="text-red-700 text-xs uppercase tracking-wider font-extrabold">
                  {isTrackingLive ? 'Live Device GPS' : 'Accident Location'}
                </strong>
              </div>
              <span className="text-xs text-slate-800 font-semibold block leading-snug">
                {accidentLocation.label}
              </span>
              {accidentLocation.accuracyMeters && (
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  GPS Precision: ±{accidentLocation.accuracyMeters}m
                </span>
              )}
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Perimeter: {radiusKm} km radius
              </span>
              <span className="text-[9px] text-sky-700 font-bold block mt-1">
                Drag marker or click map to move accident pin
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Numbered Hospital Markers (All Matching Hospitals in Radius) */}
        {hospitals.map((hosp, idx) => {
          const rank = idx + 1;
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`;

          return (
            <Marker
              key={hosp.id}
              position={[hosp.latitude, hosp.longitude]}
              icon={createHospitalIcon(rank)}
              eventHandlers={{
                click: () => onSelectHospital?.(hosp),
              }}
            >
              <Popup className="font-sans">
                <div className="p-1 max-w-[220px]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-sky-400">
                      #{rank} {hosp.facilityType || 'HOSPITAL'}
                    </span>
                    <span className="text-[10px] font-bold text-sky-700">
                      {hosp.distanceKm} km (straight-line)
                    </span>
                  </div>

                  <strong className="text-slate-900 text-xs block font-bold leading-tight">
                    {hosp.name}
                  </strong>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{hosp.area}</span>

                  <div className="mt-2 text-[10px] font-medium text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                    {hosp.capacityConnected ? (
                      <span className="text-emerald-700 font-bold">
                        ICU Beds: {hosp.beds.find((b) => b.category === 'EMERGENCY_ICU')?.availableBeds ?? 0} Available
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        Mapped via OpenStreetMap. Call or visit casualty desk directly.
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    {hosp.emergencyContactPhone ? (
                      <a
                        href={`tel:${hosp.emergencyContactPhone}`}
                        className="flex-1 text-center py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-colors"
                      >
                        Call Facility
                      </a>
                    ) : (
                      <span className="flex-1 text-center py-1.5 bg-slate-100 text-slate-400 rounded-md text-[9px] font-semibold">
                        No Phone in OSM
                      </span>
                    )}
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[10px] font-bold transition-colors"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Interactive Hint Bar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-1000 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-md text-[11px] text-slate-700 flex items-center justify-between gap-2">
        <span className="font-medium">
          {isTrackingLive ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Live GPS Tracking Active
            </span>
          ) : (
            <span>
              Click map or drag <strong className="text-red-600">Red Pin</strong> to change location
            </span>
          )}
        </span>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-1000 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200/80 shadow-md text-[11px] text-slate-700 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-2xs inline-block"></span>
          <span>Selected Location Pin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-900 border border-sky-400 inline-flex items-center justify-center text-[9px] text-sky-400 font-bold">#</span>
          <span>Matching Hospitals in Radius ({hospitals.length} total)</span>
        </div>
      </div>
    </div>
  );
};
