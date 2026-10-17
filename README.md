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
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passed-brightgreen.svg)](#-automated-testing--verification)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

> **SurgeWatch** is an emergency healthcare discovery and hospital capacity signaling platform engineered for **Bengaluru, Karnataka, India**. During road traffic accidents, acute trauma, or medical emergencies, SurgeWatch acquires user coordinates via GPS or interactive manual placement, queries live OpenStreetMap healthcare nodes, calculates geodesic straight-line distance via the Haversine formula, and displays **all available matching hospitals within strictly selectable 5 km, 10 km, or 15 km radii** without arbitrary record caps — fully synchronized across an interactive Leaflet map and proximity-sorted hospital cards with Google Maps navigation.

---

## 📑 Table of Contents
1. [🌟 Updated Core Features & Technical Deep Dive](#-updated-core-features--technical-deep-dive)
   - [1. Real-Time Device GPS & Location Acquisition](#1-🛰️-real-time-device-gps--location-acquisition)
   - [2. 4-Tier Controlled Location Fallback Hierarchy](#2-🛡️-controlled-4-tier-location-fallback-hierarchy)
   - [3. Real Hospital Discovery via OpenStreetMap (Overpass API)](#3-🏥-real-hospital-discovery-via-openstreetmap-overpass-api)
   - [4. High-Availability Mirror Failover & 15-Minute Caching](#4-⚡-high-availability-mirror-failover-architecture)
   - [5. Strict Radius Filtering: 5 km, 10 km, and 15 km (No 5-Record Limit)](#5-🎯-strict-radius-filtering-5-km-10-km-and-15-km-no-record-cap)
   - [6. Geodesic Distance Calculation (Haversine Formula)](#6-📏-accurate-geodesic-distance-calculation-haversine-formula)
   - [7. Synchronized Leaflet Map & Hospital Cards](#7-🗺️-synchronized-leaflet-map--hospital-list)
   - [8. Data Integrity & Strict Non-Fabrication Standard](#8-🔒-data-integrity--strict-non-fabrication-policy)
   - [9. Transparent Clinical Capacity Distinction](#9-⚖️-transparent-capacity-distinction)
   - [10. Live Reverse Geocoding & Offline Spatial Heuristics](#10-🗺️-live-reverse-geocoding--offline-spatial-heuristics)
   - [11. Hospital Administration & Platform Governance Portals](#11-🔐-hospital-administration--platform-governance-portals)
2. [🔄 Data Discovery Flow Architecture](#-data-discovery-flow-architecture)
3. [🏗️ Monorepo Architecture & Directory Structure](#-architecture--monorepo-structure)
4. [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
5. [🧪 Automated Testing & Verification (31-Point Suite)](#-automated-testing--verification)
6. [📡 REST API Reference & Schemas](#-rest-api-reference)
7. [🔒 Security, Privacy & Git Best Practices](#-security-privacy--git-best-practices)
8. [⚠️ Emergency Medical Disclaimer](#-emergency-medical-disclaimer)
9. [📄 License](#-license)

---

## 🌟 Updated Core Features & Technical Deep Dive

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

### 8. 🔒 Data Integrity & Strict Non-Fabrication Policy
- **Zero Dummy Contact Numbers**: SurgeWatch strictly forbids injecting placeholder phone numbers (e.g., `+91 80 2345 6789` or simulated helplines).
- **Authentic OSM Metadata**: Only genuine contact numbers mapped in OpenStreetMap tags (`phone`, `contact:phone`, `emergency:phone`) are shown.
- **Transparent Absence Disclosure**: If contact details are not available on OSM, the interface explicitly displays *"Contact number not available on OSM"* rather than misleading users in an emergency.

### 9. ⚖️ Transparent Capacity Distinction
- **Geographic Existence $\neq$ Clinical Capacity**:
  - **OpenStreetMap Facilities**: Verified geographic healthcare facilities mapped by community contributors. Labeled with an explicit transparency notice:
    > *"Live Bed Availability Not Connected — Mapped geographic facility via OpenStreetMap. Call casualty desk to confirm room & triage readiness."*
  - **Verified Registry Hospitals**: Institutions connected to SurgeWatch live telemetry, displaying verified real-time ICU beds, trauma resuscitation bays, duty doctors, and ready ALS/BLS ambulances with last-updated timestamps.
- **Attribution & Coverage Disclaimer**: Transparently credits OpenStreetMap contributors under the Open Database License (ODbL) and discloses that community records may be subject to local variations.

### 10. 🗺️ Live Reverse Geocoding & Offline Spatial Heuristics
- **Nominatim Reverse Geocoding**: Resolves raw GPS coordinates into human-readable street names and neighborhood areas (e.g., *"Mahayogi Vemana Road, Koramangala East, Bengaluru"*).
- **Offline Bounding Box Heuristics**: If Nominatim is throttled or unreachable, a spatial heuristic resolves coordinates against calibrated bounding boxes for 16 major Bengaluru sectors (Koramangala, Indiranagar, Whitefield, Electronic City, Hebbal, Yelahanka, Peenya, Malleshwaram, Jayanagar, BTM Layout, HSR Layout, Rajajinagar, Banashankari, Marathahalli, Bellandur, Majestic).

### 11. 🔐 Hospital Administration & Platform Governance Portals
- **Hospital Admin Portal**: Authenticated hospital staff and casualty superintendents can atomically update bed capacity, on-duty doctors, and ambulance fleets with cryptographic audit logging.
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
│   │   ├── components/         # HospitalCard, MapPreview, RadiusSelector, LandmarkBar, etc.
│   │   ├── context/            # AuthContext (JWT session state)
│   │   ├── data/               # Bengaluru landmarks & offline fallback records
│   │   ├── hooks/              # useDeviceLocation, useHospitalSearch
│   │   ├── pages/              # LandingPage, PatientSearchPage, Admin Dashboards
│   │   ├── services/           # api.ts (REST client), socket.ts (Socket.IO client)
│   │   ├── types/              # TypeScript schemas for Hospital, LocationState, etc.
│   │   └── utils/              # Haversine distance, travel time, and freshness math
│   └── package.json
│
├── server/                     # Backend Application (Node.js + Express 5 + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Relational models (User, Hospital, Beds, Staff, etc.)
│   │   └── seed.ts             # Bengaluru seed data (Victoria, Manipal, St. John's, etc.)
│   ├── src/
│   │   ├── controllers/        # hospitalController, locationController, adminController
│   │   ├── middleware/         # authMiddleware (JWT role verification)
│   │   ├── routes/             # hospitalRoutes, locationRoutes, authRoutes, adminRoutes
│   │   ├── services/           # osmHospitalService (Overpass API), locationService (Nominatim)
│   │   ├── utils/              # spatial.ts (Haversine math), freshness.ts
│   │   ├── testStageNearbyHospitals.ts # Automated 31-point verification suite
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
git clone https://github.com/your-username/Surge_Watch.git
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
👉 **`http://localhost:5173/search`** (Emergency Hospital Discovery & Map)

---

## 🧪 Automated Testing & Verification

SurgeWatch includes a comprehensive 31-point automated integration test suite in `server/src/testStageNearbyHospitals.ts` covering coordinate validation, radius boundaries, Overpass OSM discovery, Haversine distance math, reverse geocoding, and capacity transparency:

Execute the nearby discovery test suite:
```bash
# From repository root
npm run test:nearby

# Or from server directory
cd server && npm run test:nearby
```

### 📊 Verified Test Scenarios (31 / 31 Passed, 0 Failed):

| Test Suite | Assertions Verified | Status |
| :--- | :--- | :---: |
| **1. Coordinate Validation** | Missing coordinates rejected (`400 Bad Request`); latitude $> 90^{\circ}$ rejected | ✅ PASS |
| **2. Radius Validation** | Unsupported radius `7 km` rejected (`400 Bad Request`); `20 km` rejected | ✅ PASS |
| **3. Dual Endpoint Routing** | Accessible at both `/api/hospitals/nearby` and `/api/v1/hospitals/nearby` | ✅ PASS |
| **4. 5 km Discovery** | Returns 200 OK; returns all matching facilities (~230 hospitals); 0 perimeter violations; strict distance ascending order | ✅ PASS |
| **5. 10 km Discovery** | Returns 200 OK; returns $\ge 5\text{ km}$ count (~649 hospitals); 100% of 5 km facilities present as superset; 0 perimeter violations | ✅ PASS |
| **6. 15 km Discovery** | Returns 200 OK; returns $\ge 10\text{ km}$ count (~967 hospitals); 100% of 10 km facilities present as superset; 0 perimeter violations | ✅ PASS |
| **7. Elimination of 5-Cap** | Confirmed complete removal of arbitrary 5-hospital limit; renders full matching datasets | ✅ PASS |
| **8. Data Integrity & Non-Fabrication** | Verified no fabricated default phone numbers; all coordinates verified; OSM attribution & disclaimers verified | ✅ PASS |
| **9. Reverse Geocoding** | Resolves coordinates to neighborhood addresses via Nominatim (`"Mahayogi Vemana Road, Koramangala East"`) | ✅ PASS |
| **10. Approximate IP Geolocation** | Resolves city-level IP; flags `isGpsAccurate: false`; tags `IP_APPROXIMATE`; provides explicit user disclaimer | ✅ PASS |

---

## 📡 REST API Reference

### Nearby Hospital Discovery Endpoint

```http
GET /api/hospitals/nearby?lat={latitude}&lon={longitude}&radiusKm={5|10|15}
```
*(Also available as `/api/v1/hospitals/nearby`)*

#### Request Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `lat` | `float` | **Yes** | Latitude of user/incident origin ($-90.0 \le \text{lat} \le 90.0$) |
| `lon` *(or `lng`)* | `float` | **Yes** | Longitude of user/incident origin ($-180.0 \le \text{lon} \le 180.0$) |
| `radiusKm` *(or `radius`)* | `int` | **Yes** | Search perimeter in kilometers. **Strictly `5`, `10`, or `15`**. Other values return `400 Bad Request`. |

#### Response Schema (`200 OK`):
```json
{
  "success": true,
  "count": 230,
  "data": [
    {
      "id": "osm-node-123456789",
      "name": "HCG Hospital Koramangala",
      "address": "80 Feet Road, 4th Block, Koramangala, Bengaluru",
      "phone": "+91 80 4060 8888",
      "contactAvailable": true,
      "distance": "0.2 km",
      "distanceKm": 0.23,
      "distanceType": "straight_line",
      "facilityType": "Hospital",
      "isRegistered": false,
      "hasLiveTelemetry": false,
      "directionsUrl": "https://www.google.com/maps/dir/?api=1&destination=12.9341,77.6259",
      "location": {
        "lat": 12.9341,
        "lng": 77.6259
      }
    }
  ],
  "meta": {
    "radiusKm": 5,
    "userLocation": {
      "lat": 12.9352,
      "lon": 77.6245
    },
    "source": "OpenStreetMap",
    "attribution": "Data © OpenStreetMap contributors, ODbL 1.0",
    "coverageNotice": "Community-sourced healthcare facilities. Emergency room intake confirmation advised."
  }
}
```

#### Error Response (`400 Bad Request`):
```json
{
  "success": false,
  "error": "Invalid radiusKm. Allowed values are 5, 10, or 15 km."
}
```

---

### Complete Endpoint Directory

| Method | Endpoint | Description | Query / Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hospitals/nearby` | Discovers all matching hospitals within selected radius via OpenStreetMap & local registry, sorted by straight-line distance | `lat`, `lon` (or `lng`), `radiusKm` (`5`, `10`, `15`) |
| `GET` | `/api/v1/hospitals/search` | Radius search with service filters (`ALL`, `ICU`, `TRAUMA`, `AMBULANCE`) | `lat`, `lng`, `radius`, `service`, `sortBy` |
| `GET` | `/api/v1/hospitals/:id` | Detailed hospital profile, bed breakdown, and doctor metrics | None |
| `GET` | `/api/v1/location/reverse-geocode`| Resolves coordinates to neighborhood address via Nominatim | `lat`, `lng` |
| `GET` | `/api/v1/location/ip-lookup` | Returns approximate city-level IP location with disclaimer | None |
| `POST`| `/api/v1/auth/login-admin` | Authenticates hospital administrator & returns JWT token | Body: `{ email, password }` |
| `PUT` | `/api/v1/admin/hospitals/:id/resources` | Updates available beds, doctors, and ambulances | Bearer Token, Body: `{ beds, staff, ambulances }` |

Interactive API documentation is also available live at:
👉 **`http://localhost:5000/api/docs`**

---

## 🔒 Security, Privacy & Git Best Practices

- **Zero Committed Secrets**: `.env` and `dev.db` files are strictly excluded from version control via `.gitignore`.
- **Environment Template**: `.env.example` provides a sanitized configuration reference for developers.
- **Privacy Protection**: Database files, system logs, build caches, and private keys are barred from git staging.
- **Rigorous Input Sanitization**: Geographic coordinates are bounded and validated against strict numerical limits before processing.
- **Failover Security**: Public API timeouts are enforced ($15\text{s}$ per mirror) to prevent server thread blocking.

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
