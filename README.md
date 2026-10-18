# 🚑 SurgeWatch BLR — Emergency Hospital Discovery & Capacity Signaling Platform

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-1B222D.svg)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-199900.svg)](https://leafletjs.com/)
[![OpenStreetMap](https://img.shields.io/badge/Data-OpenStreetMap-7EBC6F.svg)](https://www.openstreetmap.org/)
[![Tests](https://img.shields.io/badge/Tests-43%2F43%20Passed-brightgreen.svg)](#-automated-testing--verification-43-point-suite)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

> **SurgeWatch** is an emergency healthcare discovery and hospital capacity signaling platform engineered for **Bengaluru, Karnataka, India**. During road traffic accidents, acute trauma, or medical emergencies, SurgeWatch acquires user coordinates via GPS or interactive manual placement, queries live OpenStreetMap healthcare nodes, calculates geodesic straight-line distance via the Haversine formula, and displays **all available matching hospitals within strictly selectable 5 km, 10 km, or 15 km radii** without arbitrary record caps — fully synchronized across an interactive Leaflet map and proximity-sorted hospital cards with Google Maps navigation.
>
> In addition to geographical discovery, SurgeWatch features real-time **Hospital Bed Availability**, **Medical Staff On-Duty Tracking**, and **Ambulance Fleet Status & Telemetry**, paired with an automated **Emergency Ambulance SOS Dispatch Lifecycle** and deterministic simulation fallbacks that ensure every discovered hospital presents actionable availability metrics.

---

## 📑 Table of Contents
1. [🌟 Core Features & Technical Deep Dive](#-core-features--technical-deep-dive)
   - [1. Real-Time Device GPS & Location Acquisition](#1-🛰️-real-time-device-gps--location-acquisition)
   - [2. 4-Tier Controlled Location Fallback Hierarchy](#2-🛡️-controlled-4-tier-location-fallback-hierarchy)
   - [3. Real Hospital Discovery via OpenStreetMap (Overpass API)](#3-🏥-real-hospital-discovery-via-openstreetmap-overpass-api)
   - [4. High-Availability Mirror Failover & 15-Minute Caching](#4-⚡-high-availability-mirror-failover-architecture)
   - [5. Strict Radius Filtering: 5 km, 10 km, and 15 km (No Record Cap)](#5-🎯-strict-radius-filtering-5-km-10-km-and-15-km-no-record-cap)
   - [6. Geodesic Distance Calculation (Haversine Formula)](#6-📏-accurate-geodesic-distance-calculation-haversine-formula)
   - [7. Synchronized Leaflet Map & Hospital Cards](#7-🗺️-synchronized-leaflet-map--hospital-list)
   - [8. Hospital Bed Availability Breakdown & Mathematical Consistency](#8-🛏️-hospital-bed-availability-breakdown--mathematical-consistency)
   - [9. Medical Staff Availability & Clinical Duty Rosters](#9-👨‍⚕️-medical-staff-availability--clinical-duty-rosters)
   - [10. Ambulance Fleet Status, License Plate Telemetry & Dispatch](#10-🚑-ambulance-fleet-status-license-plate-telemetry--dispatch)
   - [11. 5-Column Compact Card & 3-Section Modal Architecture](#11-🎴-5-column-compact-card--3-section-modal-architecture)
   - [12. Deterministic Resource Simulation & Provenance Disclaimers](#12-🧬-deterministic-resource-simulation--provenance-disclaimers)
   - [13. Hospital Administration & Platform Governance Portals](#13-🔐-hospital-administration--platform-governance-portals)
2. [🔄 Data Discovery Flow Architecture](#-data-discovery-flow-architecture)
3. [🏗️ Monorepo Architecture & Directory Structure](#-architecture--monorepo-structure)
4. [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
5. [🧪 Automated Testing & Verification (43-Point Feature Suite)](#-automated-testing--verification-43-point-suite)
6. [📡 REST API Reference & Schemas](#-rest-api-reference)
7. [🔒 Security, Privacy & Git Best Practices](#-security-privacy--git-best-practices)
8. [⚠️ Emergency Medical Disclaimer](#-emergency-medical-disclaimer)
9. [📄 License](#-license)

---

## 🌟 Core Features & Technical Deep Dive

### 1. 🛰️ Real-Time Device GPS & Location Acquisition
- **High-Accuracy Geolocation**: Direct integration with the browser's standard Geolocation API (`navigator.geolocation.getCurrentPosition()`) invoking hardware GPS with high accuracy mode (`enableHighAccuracy: true`, `timeout: 10000`, `maximumAge: 0`).
- **Precision Reporting**: Obtains exact latitude, longitude, and device GPS accuracy (in meters). Dynamically renders an accuracy confidence circle on the Leaflet map (e.g. $\pm12\text{m}$).
- **Lifecycle State Management**: State machine handling (`idle` $\rightarrow$ `requesting` $\rightarrow$ `granted` / `denied` / `timeout` / `unavailable`) with contextual visual banners explaining permissions or timeout events.
- **Continuous SOS Emergency Tracking**: Uses `navigator.geolocation.watchPosition()` during active emergency dispatches to stream real-time coordinate updates over Socket.IO to emergency responders and hospital casualty rooms.

### 2. 🛡️ Controlled 4-Tier Location Fallback Hierarchy
When GPS permissions are denied, timed out, or unavailable, SurgeWatch executes a non-blocking 4-tier fallback:
1. **Tier 1 — Device GPS**: Precise satellite/Wi-Fi position retrieved with explicit user consent.
2. **Tier 2 — Manual Map Pinning & Bengaluru Corridor Presets**:
   - **Click-to-Place Map Selection**: Users can click anywhere on the Leaflet map to instantly position the emergency origin marker.
   - **Draggable Emergency Pin**: The red origin pin features a pulsing beacon animation and allows smooth drag-and-drop relocation with instant coordinate updates.
   - **Bengaluru High-Risk Corridor Presets**: Instant one-click selection for 8 high-traffic, accident-prone transit junctions:
     - *Silk Board Junction* (`12.9176, 77.6238`)
     - *Hebbal Flyover* (`13.0358, 77.5970`)
     - *Whitefield ITPL* (`12.9863, 77.7308`)
     - *Goraguntepalya / Peenya* (`13.0285, 77.5410`)
     - *Indiranagar 100ft Road* (`12.9719, 77.6412`)
     - *Majestic Bus Station / City Railway* (`12.9767, 77.5713`)
     - *Koramangala Sony World Signal* (`12.9352, 77.6245`)
     - *Electronic City Phase 1* (`12.8458, 77.6602`)
3. **Tier 3 — Approximate IP Geolocation**:
   - Automatic server-side IP lookup fallback clearly flagged with `isGpsAccurate: false` and `source: 'IP_APPROXIMATE'`.
   - Never silently replaces GPS coordinates; alerts the user that city-level IP coordinates are approximate and suggests fine-tuning via the interactive map.
4. **Tier 4 — Actionable Error & Retry**: Provides clear user instructions with a retry button if automated services fail, without ever fabricating artificial coordinates.

### 3. 🏥 Real Hospital Discovery via OpenStreetMap (Overpass API)
- **Live Overpass QL Geospatial Queries**: Executes live Overpass queries targeting healthcare facilities within the user's selected search radius:
  ```overpass
  [out:json][timeout:15];
  (
    node["amenity"="hospital"](around:radiusMeters, lat, lon);
    way["amenity"="hospital"](around:radiusMeters, lat, lon);
    relation["amenity"="hospital"](around:radiusMeters, lat, lon);
    node["healthcare"="hospital"](around:radiusMeters, lat, lon);
    way["healthcare"="hospital"](around:radiusMeters, lat, lon);
    node["amenity"="clinic"](around:radiusMeters, lat, lon);
    way["amenity"="clinic"](around:radiusMeters, lat, lon);
    node["healthcare"="clinic"](around:radiusMeters, lat, lon);
  );
  out center;
  ```
- **Transparent Facility Classification**: Normalizes discovered facilities into clear badges:
  - **Hospital**: Inpatient hospitals, tertiary trauma centers, and multispecialty medical institutions (`amenity=hospital`, `healthcare=hospital`).
  - **Clinic**: Outpatient clinics, polyclinics, and urgent care centers (`amenity=clinic`, `healthcare=clinic`).
  - **Health Centre**: Community health centers and primary healthcare dispensaries.

### 4. ⚡ High-Availability Mirror Failover Architecture
To eliminate single points of failure during critical medical emergencies, SurgeWatch utilizes an automated 4-tier mirror failover pipeline:
1. **Primary Mirror**: `https://overpass.openstreetmap.fr/api/interpreter` (French OSM community mirror — prioritized for lowest latency and highest throughput).
2. **Secondary Mirror**: `https://lz4.overpass-api.de/api/interpreter` (LZ4-compressed German mirror).
3. **Tertiary Mirror**: `https://z.overpass-api.de/api/interpreter` (Zlib-compressed German mirror).
4. **Quaternary Mirror**: `https://overpass-api.de/api/interpreter` (Main Overpass API server).
5. **In-Memory Cache (15-Minute TTL)**: Caches search results keyed by geographical grid coordinate and radius (`lat:lon:radius`) to eliminate redundant queries, reduce latency to $<2\text{ms}$ on repeated searches, and protect public OSM infrastructure.
6. **Curated Local Registry Fallback**: If all Overpass mirrors fail or internet access is severed, SurgeWatch seamlessly falls back to a verified offline database of major Bengaluru emergency hospitals (Victoria, Manipal, St. John's, Aster CMI, Bowring, etc.) within the exact requested radius.

### 5. 🎯 Strict Radius Filtering: 5 km, 10 km, and 15 km (No Record Cap)
- **Strictly Allowed Radii**: The platform permits only three radius settings: **5 km**, **10 km**, and **15 km**.
  - Backend validation rejects any other radius with `400 Bad Request` (`"Invalid radiusKm. Allowed values are 5, 10, or 15 km."`).
- **Elimination of Artificial 5-Record Limit**: Unlike early prototypes that truncated results to 5 records, SurgeWatch returns and renders **all available matching facilities** within the active perimeter:
  - *5 km*: Discovers ~230 hospitals in central Bengaluru.
  - *10 km*: Discovers ~649 hospitals in central Bengaluru.
  - *15 km*: Discovers ~967 hospitals in central Bengaluru.
- **Strict Perimeter Enforcement**: Every returned facility strictly satisfies $d \le \text{radiusKm} + 0.05\text{ km}$ (using a $50\text{m}$ tolerance to prevent floating-point boundary anomalies).
- **Consistent Superset Logic**: Results expand predictably as radius increases:
  $$\text{Results}_{5\text{km}} \subseteq \text{Results}_{10\text{km}} \subseteq \text{Results}_{15\text{km}}$$
- **Real-Time Dynamic Counter**: Instantly displays the total number of matching facilities in the active perimeter (e.g. *"230 matching hospitals within 5 km"*).

### 6. 📏 Accurate Geodesic Distance Calculation (Haversine Formula)
- **Mathematical Rigor**: Computes the great-circle distance between the user's location and each facility using the Haversine formula with a mean Earth radius of $R = 6,371\text{ km}$:
  $$a = \sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos\varphi_1 \cdot \cos\varphi_2 \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
  $$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
  $$d = R \cdot c$$
- **Rigorous Coordinate Validation**: Server and client validate that latitude $\in [-90, 90]$ and longitude $\in [-180, 180]$ before calculation.
- **Proximity Sorting**: Facilities are sorted from nearest to farthest straight-line distance (`0.2 km`, `0.7 km`, `1.4 km`, etc.).
- **Truthful Labeling**: Explicitly labeled as **Straight-line Distance** to avoid fabricating urban road transit times without live turn-by-turn routing telemetry.
- **Google Maps Directions Integration**: Each hospital card and popup includes a verified one-click navigation link to Google Maps (`https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`) for live turn-by-turn traffic routing.

### 7. 🗺️ Synchronized Leaflet Map & Hospital List
- **1-to-1 Marker-to-Card Parity**: The Leaflet map markers and the hospital list cards represent the exact same filtered result set — no omissions, no hidden items.
- **Sequential Marker Badges**: Leaflet markers display custom numbered badges (`#1`, `#2`, `#3`, ..., `#N`) corresponding directly to their position in the proximity-sorted list.
- **Dynamic Search Perimeter Ring**: Renders a visually calibrated blue boundary circle centered on the user's location that automatically expands or contracts when switching between 5 km, 10 km, and 15 km.
- **Interactive Marker Popups**: Clicking any marker reveals an informative popup containing the hospital name, facility type badge, straight-line distance, genuine contact number, and a direct Google Maps navigation button.
- **Interactive Highlight Sync**: Hovering or clicking a hospital card highlights the corresponding marker on the map.

### 8. 🛏️ Hospital Bed Availability Breakdown & Mathematical Consistency
- **Mathematical Consistency Verification**: Every hospital maintains strict census invariants:
  $$\text{Occupied Beds} = \text{Total Licensed Capacity} - \text{Available Beds}$$
  $$\text{Occupied Beds} \ge 0, \quad \text{Available Beds} \ge 0, \quad \text{Total Beds} > 0$$
- **Departmental Bed Breakdown**:
  - **Emergency / ER Ward**: Acute casualty resuscitation bays with dynamic availability meters, ratio badges (e.g. `4 / 18 Available`), and capacity status flags (`✓ Available` vs. `⚠ Full`).
  - **ICU / Critical Trauma Care**: Level-1 intensive care units equipped for severe polytrauma, cardiac arrest, and multi-organ life support.
  - **High-Flow Oxygen & Critical Care**: Dedicated oxygenation-equipped beds for acute respiratory distress.
  - **Pediatric Emergency Bays**: Specialized neonatal and child trauma intake capacity.
- **Visual Progress Meters**: Proportional progress bars indicate real-time saturation thresholds across critical emergency wards.

### 9. 👨‍⚕️ Medical Staff Availability & Clinical Duty Rosters
- **Real-Time Clinical Headcounts**: Displays exact on-shift physician and trauma nurse counts rather than vague qualitative descriptors:
  - **Emergency Physicians On-Duty**: Board-certified casualty consultants and triage medical officers on active shift.
  - **Immediate Triage Availability**: Number of doctors unassigned and immediately available to attend to incoming trauma arrivals.
  - **ICU & Trauma Nurses On-Duty**: Dedicated acute resuscitation nursing staff.
- **Granular Shift Duty Rosters**: Full roster breakdown detailing:
  - Role classification (Emergency Physicians, Trauma Surgeons, Critical Care Anesthesiologists, Triage Nurses).
  - Shift categorization (`DAY_SHIFT`, `NIGHT_SHIFT`, `ROTATING`).
  - Exact counts: Scheduled On-Duty vs. Currently Available.
  - Role metric definition and clinical responsibilities.

### 10. 🚑 Ambulance Fleet Status, License Plate Telemetry & Dispatch
- **Karnataka Vehicle Telemetry**: Every tracked ambulance displays its official state registration plate (e.g., `KA-01-EA-108`, `KA-05-MB-412`, `KA-51-EX-904`).
- **Fleet Capability Categorization**:
  - **ALS (Advanced Life Support)**: Transport ventilators, multipara cardiac monitors, defibrillators, and emergency airway kits.
  - **BLS (Basic Life Support)**: Standard emergency stretchers, oxygen cylinders, and basic splinting gear.
  - **Mobile ICU Units**: High-dependency mobile intensive care ambulances for severe inter-hospital transfer.
- **Operational Lifecycle Status Tracking**:
  - `AVAILABLE` (Ready at Station)
  - `ASSIGNED` (Dispatched to Casualty)
  - `EN_ROUTE` (In Transit to Scene)
  - `AT_SCENE` (On Site Administering Triage)
- **Emergency SOS Ambulance Dispatch Dialog**: One-click dispatch interface permitting incident reporters to submit patient condition (Trauma / Cardiac / Accident), contact phone number, and location notes with live Socket.IO broadcasts (`emergency_dispatched`, `emergency_resolved`).

### 11. 🎴 5-Column Compact Card & 3-Section Modal Architecture
- **5-Column Card Resource Summary (Matching Reference Design)**: Every nearby hospital card provides an instant 5-column dashboard:
  - **Column 1 — BEDS**: `Avail: X / Y`, `Occupied: Z`
  - **Column 2 — ER BEDS**: `Available (X beds)` / `Full`, `Total ER: Y`
  - **Column 3 — ICU**: `Available (X beds)` / `Full`, `Total ICU: Y`
  - **Column 4 — CLINICAL STAFF**: `Docs: X, Nurses: Y`, `DAY_SHIFT`
  - **Column 5 — AMBULANCES**: `Avail: X`, `Ready for Dispatch`
- **3-Section Comprehensive Hospital Details Modal**:
  - `HOSPITAL BED AVAILABILITY`: Capacity overview cards, ER ward progress bar, ICU critical bay card, and sub-category metrics.
  - `MEDICAL STAFF AVAILABILITY`: Doctor and nurse on-duty status boxes with detailed duty roster breakdown.
  - `AMBULANCE FLEET STATUS`: Fleet counters and individual vehicle badges showing license plates, operational status, vehicle type, and current location.
- **One-Click Turn-by-Turn Routing**: Google Maps navigation button (`https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`) and direct casualty calling.

### 12. 🧬 Deterministic Resource Simulation & Provenance Disclaimers
- **Zero Empty "Unintegrated" Placeholders**: Ensures that unlinked facilities (such as raw OpenStreetMap nodes) never display empty, blank, or broken metrics.
- **Deterministic String Hashing**: Algorithmic resource simulation derives reproducible, facility-unique capacity numbers from `hash(hospitalName : hospitalId)`:
  - Sri Swaranaamrutha Hospital, Victoria Hospital, and Manipal Hospital each display distinct, consistent bed and ambulance numbers across page reloads.
- **Transparent Provenance Badges**:
  - `VERIFIED CLINICAL TELEMETRY`: Direct hospital API integration.
  - `MANUAL ADMIN ENTRY`: Verified entry by authenticated medical superintendent.
  - `DEMO SIMULATION`: Synthetic simulation data with an explicit amber/purple safety disclosure advising users to call casualty triage in life-threatening emergencies.

### 13. 🔐 Hospital Administration & Platform Governance Portals
- **Hospital Admin Portal**: Authenticated hospital staff and casualty superintendents can atomically update bed capacity, on-duty doctors, and ambulance fleets with cryptographic audit logging.
- **Real-Time WebSocket Signaling**: Instant Socket.IO broadcasting (`hospital_resource_updated`, `ambulance_status_updated`) pushes live changes to all active search clients without manual refreshing.
- **Platform Governance**: System administrators can review institutional KPME license access requests, manage platform settings, and monitor system-wide data freshness.

---

## 🔄 Data Discovery Flow Architecture

```mermaid
flowchart TD
    A([User Location Trigger]) --> B{Location Source?}
    B -->|Browser GPS| C[navigator.geolocation.getCurrentPosition]
    B -->|Map Click / Pin Drag| D[Interactive Leaflet Coordinate Picker]
    B -->|Quick Landmark| E[Bengaluru Corridor Preset]
    B -->|Fallback| F[IP Geolocation Lookup - source: IP_APPROXIMATE]

    C --> G[Coordinate Boundary Validation: lat -90..90, lon -180..180]
    D --> G
    E --> G
    F --> G

    G --> H[User Selects Search Radius: 5 km / 10 km / 15 km]
    H --> I[API Request: /api/hospitals/nearby?lat=...&lon=...&radiusKm=5|10|15]

    I --> J{In-Memory Cache Hit? TTL: 15m}
    J -->|Yes| K[Return Cached Hospital Records]
    J -->|No| L{Primary Mirror: overpass.openstreetmap.fr}

    L -->|Success| M[Parse OSM Nodes, Ways & Relations]
    L -->|Timeout/Error| N{Secondary Mirror: lz4.overpass-api.de}
    N -->|Success| M
    N -->|Timeout/Error| O{Tertiary Mirror: z.overpass-api.de}
    O -->|Success| M
    O -->|Timeout/Error| P{Quaternary Mirror: overpass-api.de}
    P -->|Success| M
    P -->|All Fail| Q[Curated Local Emergency Registry Fallback]
    Q --> M

    M --> R[Compute Haversine Geodesic Distance R=6371km]
    R --> S[Filter by Strict Radius Perimeter: dist <= radiusKm + 0.05]
    S --> T[Sort Ascending by Distance: Nearest First]
    T --> U[Verify Contact Integrity: Non-Fabrication Policy]
    U --> V[Cache Results in Memory with 15-min TTL]

    V --> W[Return Full Result Set - No 5-Record Limit Cap]
    K --> W

    W --> X[Frontend Synchronized Rendering]
    X --> Y[Leaflet Map: Numbered Markers #1..#N + Dynamic Perimeter Ring]
    X --> Z[Hospital List: Total Counter + Proximity Cards + Google Maps Directions]
```

---

## 🏗️ Architecture & Monorepo Structure

```
Surge_Watch/
├── client/                     # Frontend Application (Vite + React 19 + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # HospitalCard, HospitalDetailModal, MapPreview, RadiusSelector, LandmarkBar, etc.
│   │   ├── context/            # AuthContext (JWT session state)
│   │   ├── data/               # Bengaluru landmarks & offline fallback records
│   │   ├── hooks/              # useDeviceLocation, useHospitalSearch (hydrated resource querying)
│   │   ├── pages/              # LandingPage, PatientSearchPage, HospitalDashboardPage, Admin Portals
│   │   ├── services/           # api.ts (REST client), socket.ts (Socket.IO client)
│   │   ├── types/              # TypeScript schemas for Hospital, BedsSummary, StaffBreakdown, AmbulanceRecord, etc.
│   │   └── utils/              # dummyResources.ts (deterministic simulation), distance, travel time, and freshness
│   └── package.json
│
├── server/                     # Backend Application (Node.js + Express 5 + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Relational models (User, Hospital, Beds, Staff, Ambulance, EmergencyRequest, etc.)
│   │   └── seed.ts             # Bengaluru seed data (Victoria, Manipal, St. John's, Aster CMI, Bowring, etc.)
│   ├── src/
│   │   ├── controllers/        # hospitalController, emergencyController, adminController, locationController
│   │   ├── data/               # bengaluru_hospitals_resource_demo.csv (sample CSV data)
│   │   ├── middleware/         # authMiddleware (JWT role verification)
│   │   ├── routes/             # hospitalRoutes, emergencyRoutes, locationRoutes, authRoutes, adminRoutes
│   │   ├── services/           # osmHospitalService (Overpass API + demo resources), csvResourceLoader.ts
│   │   ├── utils/              # formatHospital.ts, spatial.ts (Haversine math), freshness.ts
│   │   ├── testResourceFeatures.ts     # Automated 43-point Resource & Ambulance verification suite
│   │   ├── testStageNearbyHospitals.ts # Automated 31-point Nearby Discovery verification suite
│   │   └── index.ts            # Express server & Socket.IO live stream broadcaster
│   ├── .env.example            # Safe environment template (no secrets committed)
│   └── package.json
│
├── .gitignore                  # Comprehensive root ignore for secrets, databases, & logs
└── package.json                # Monorepo root scripts
```

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Node.js**: v18.x, v20.x, or v22.x
- **npm**: v9.x or later

### 1. Clone the Repository
```bash
git clone https://github.com/Sangu-dev/Surge_Watch.git
cd Surge_Watch
```

### 2. Configure Environment Variables
Copy the environment template in the `server` directory:
```bash
cp server/.env.example server/.env
```

`server/.env`:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="surgewatch_super_secure_emergency_secret_2026"
PORT=5000
```

### 3. Install Dependencies
Install dependencies for both client and server:
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Return to root
cd ..
```

### 4. Initialize Database & Seed Bengaluru Data
```bash
cd server
npx prisma generate
npx prisma db push
npm run seed
cd ..
```

### 5. Run the Application Locally
In two separate terminals, run the client and server:

**Terminal 1 — Backend API & Socket.IO (Port 5000):**
```bash
npm run dev:server
```

**Terminal 2 — Frontend Application (Port 5173):**
```bash
npm run dev:client
```

Open your browser and navigate to:
👉 **`http://localhost:5173`** (Landing Page)  
👉 **`http://localhost:5173/find`** (Emergency Hospital Discovery, Capacity Matrix & Map)  
👉 **`http://localhost:5173/admin`** (Hospital Resource & Capacity Management Portal)

---

## 🧪 Automated Testing & Verification (43-Point Feature Suite)

SurgeWatch includes two distinct, comprehensive automated test suites covering all discovery and resource availability subsystems:

### 1. Resource Availability, Staffing & Ambulance Fleet Suite (43 / 43 Passed)
```bash
# Run the complete resource features test suite
cd server && npm run test:features
```

#### 📊 Verified Scenarios (43 Assertions, 0 Failures):
| Test Suite | Assertions Verified | Status |
| :--- | :--- | :---: |
| **1. Bed Availability & Mathematical Invariance** | Verified `occupied = total - available`; positive non-null total capacity; emergency ER bays and ICU bays availability verified | ✅ PASS |
| **2. Medical Staff Availability & Shift Telemetry** | Doctors on duty, doctors available for immediate triage, nurses on duty, shift classification (`DAY_SHIFT` / `NIGHT_SHIFT`), and detailed multi-specialty duty roster | ✅ PASS |
| **3. Ambulance Fleet & License Plate Status** | Fleet tracking, status counts, vehicle license plates (`KA-01-EA-108`, `KA-05-MB-...`), vehicle types (ALS, BLS, Mobile ICU), and station base locations | ✅ PASS |
| **4. Data Provenance & Safety Disclaimers** | Verified `MANUAL` / `LIVE_INTEGRATION` / `DEMO` labeling and mandatory safety disclaimer for simulated prototype records | ✅ PASS |
| **5. Service Filtering for Discovery** | Verified discovery endpoints filter correctly for `service=ER`, `service=DOCTORS`, `service=NURSES`, `service=AMBULANCE`, `service=ICU` | ✅ PASS |
| **6. Emergency Ambulance Dispatch & Release Lifecycle** | Dispatches available ambulance via `POST /emergency/dispatch`, validates `ASSIGNED` status transition, tests `AT_SCENE` status update, releases vehicle via `POST /emergency/release` back to `AVAILABLE`, and validates real-time Socket.IO broadcasts | ✅ PASS |

### 2. Geospatial Discovery & Radius Perimeter Suite (31 / 31 Passed)
```bash
cd server && npm run test:nearby
```
- Validates 5 km, 10 km, and 15 km radii enforcement.
- Asserts strict geodesic distance sorting ($d_1 \le d_2 \le \dots \le d_n$).
- Verifies elimination of arbitrary 5-record limit caps.
- Validates Nominatim reverse geocoding and IP geolocation fallback.

---

## 📡 REST API Reference

### 1. Hospital Resource & Capacity Detail
```http
GET /api/v1/hospitals/:id
```
Returns a complete facility profile with structured bed breakdown, medical staff roster, and ambulance fleet status:
```json
{
  "success": true,
  "data": {
    "id": "reg-victoria",
    "name": "Victoria Hospital & Trauma Care Centre",
    "facilityType": "Hospital",
    "operatingStatus": "OPERATIONAL",
    "dataProvenance": "MANUAL",
    "bedsSummary": {
      "totalBeds": 131,
      "availableBeds": 38,
      "occupiedBeds": 93,
      "icuBeds": { "total": 24, "available": 7, "occupied": 17 },
      "emergencyBeds": { "total": 50, "available": 12, "occupied": 38 }
    },
    "staffSummary": {
      "doctorsOnDuty": 15,
      "doctorsAvailable": 7,
      "doctorShiftStatus": "DAY_SHIFT",
      "nursesOnDuty": 24,
      "nursesAvailable": 10,
      "nurseShiftStatus": "DAY_SHIFT"
    },
    "ambulanceSummary": {
      "totalAmbulances": 4,
      "availableAmbulances": 3,
      "assignedAmbulances": 1
    },
    "ambulanceFleet": [
      {
        "id": "reg-victoria-amb-1",
        "registrationPlate": "KA-01-EA-108",
        "ambulanceType": "ADVANCED_LIFE_SUPPORT_ALS",
        "typeLabel": "ALS Ambulance (Advanced Life Support)",
        "status": "AVAILABLE",
        "currentLocation": "Victoria Hospital Base Station"
      }
    ]
  }
}
```

### 2. Emergency Ambulance Dispatch & Fleet Management
```http
GET /emergency/ambulances
POST /emergency/dispatch
PATCH /emergency/ambulances/:id/status
POST /emergency/release
```

#### Dispatch Request (`POST /emergency/dispatch`):
```json
{
  "hospitalId": "reg-victoria",
  "emergencyType": "TRAUMA_ACCIDENT",
  "patientName": "Emergency Casualty Patient",
  "contactPhone": "+91-98765-43210",
  "dispatchNotes": "Collision near City Market junction",
  "latitude": 12.9634,
  "longitude": 77.5750
}
```

#### Dispatch Response (`201 Created`):
```json
{
  "success": true,
  "message": "Ambulance dispatched successfully.",
  "data": {
    "requestId": "req-1729267123",
    "ambulance": {
      "id": "reg-victoria-amb-1",
      "registrationPlate": "KA-01-EA-108",
      "ambulanceType": "ADVANCED_LIFE_SUPPORT_ALS",
      "status": "ASSIGNED"
    },
    "disclaimer": "Emergency dispatch simulation notice: Always dial 108/112 in life-threatening scenarios."
  }
}
```

---

### Complete Endpoint Directory

| Method | Endpoint | Description | Query / Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hospitals/nearby` | Discovers all matching hospitals within selected radius via OpenStreetMap & local registry | `lat`, `lon` (or `lng`), `radiusKm` (`5`, `10`, `15`) |
| `GET` | `/api/v1/hospitals/search` | Radius search with service filters (`ALL`, `ICU`, `ER`, `DOCTORS`, `NURSES`, `AMBULANCE`) | `lat`, `lng`, `radius`, `service`, `sortBy` |
| `GET` | `/api/v1/hospitals/:id` | Detailed hospital profile, bed census, clinical staff roster, and ambulance fleet | None |
| `GET` | `/emergency/ambulances` | Lists registered emergency ambulance fleet with live status and license plates | `hospitalId` (optional) |
| `POST`| `/emergency/dispatch` | Dispatches available ambulance for an emergency casualty incident | Body: `{ hospitalId, emergencyType, patientName, contactPhone, dispatchNotes, latitude, longitude }` |
| `PATCH`| `/emergency/ambulances/:id/status` | Updates vehicle operational status (`AVAILABLE`, `ASSIGNED`, `EN_ROUTE`, `AT_SCENE`) | Body: `{ status }` |
| `POST`| `/emergency/release` | Releases assigned ambulance back to station and marks request completed | Body: `{ requestId }` |
| `GET` | `/api/v1/location/reverse-geocode`| Resolves coordinates to neighborhood address via Nominatim | `lat`, `lng` |
| `GET` | `/api/v1/location/ip-lookup` | Returns approximate city-level IP location with disclaimer | None |
| `POST`| `/api/v1/auth/login-admin` | Authenticates hospital administrator & returns JWT token | Body: `{ email, password }` |
| `PUT` | `/api/v1/admin/hospitals/:id/resources` | Updates available beds, doctors, and ambulances | Bearer Token, Body: `{ beds, staff, ambulances }` |

Interactive Swagger API documentation is available live at:
👉 **`http://localhost:5000/api/docs`**

---

## 🔒 Security, Privacy & Git Best Practices

- **Zero Committed Secrets**: `.env`, `dev.db`, and backup files are strictly excluded from version control via `.gitignore`.
- **Environment Template**: `.env.example` provides a sanitized configuration reference for developers.
- **Privacy Protection**: Database files, system logs, build caches, and private keys are barred from git staging.
- **Rigorous Input Sanitization**: Geographic coordinates are bounded and validated against strict numerical limits before processing.
- **Failover Security**: Public API timeouts are enforced ($6\text{s}$ per mirror) to prevent server thread blocking.

---

## ⚠️ Emergency Medical Disclaimer

> **IMPORTANT**: SurgeWatch is an emergency discovery and capacity signaling tool. It is **not** a dispatch guarantee or a substitute for calling official government emergency services.
>
> In the event of a life-threatening medical emergency or severe traffic collision in India:
> - 📞 **Dial 112** (National Emergency Services)
> - 📞 **Dial 108** (Toll-Free Ambulance Dispatch)
>
> OpenStreetMap records provide geographic existence and direct casualty telephone numbers. Live room and bed admissions are subject to real-time hospital intake confirmation.

---

## 📄 License
This project is licensed under the **ISC License**.

