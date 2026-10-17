# 🚑 SurgeWatch BLR — Emergency Hospital Discovery & Capacity Signaling Platform

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-1B222D.svg)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
[![OpenStreetMap](https://img.shields.io/badge/Data-OpenStreetMap-7EBC6F.svg)](https://www.openstreetmap.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

> **SurgeWatch** is an emergency-response and hospital-discovery web application focused on **Bengaluru, Karnataka, India**. During road accidents or critical medical episodes, the platform identifies the closest emergency hospital facilities, computes geodesic straight-line distance and emergency transit times, and presents the **nearest 5 hospital recommendations** with transparent capacity signaling and navigation links.

---

## 🌟 Key Features

### 1. 🛰️ Real-Time Device Location Using GPS
- **One-Click Acquisition**: Queries the browser's `navigator.geolocation.getCurrentPosition()` to obtain latitude, longitude, and reported precision (`accuracy` in meters).
- **Continuous Emergency Tracking**: Activates `navigator.geolocation.watchPosition()` during active emergencies, streaming throttled position updates over Socket.IO to responders and hospital triage rooms.
- **Accuracy Rings**: Dynamically renders a precision circle on the Leaflet map corresponding to device GPS accuracy (e.g., $\pm12\text{m}$).

### 2. 🛡️ Controlled 4-Tier Location Fallback Hierarchy
1. **Tier 1 — Device GPS**: Precision coordinates obtained with explicit browser permission.
2. **Tier 2 — Manual Accident Spot**: Allows users to click anywhere on the map, drag the red accident marker, search streets, or select common Bengaluru junction presets (e.g., *Silk Board, Hebbal Flyover, Whitefield ITPL, Goraguntepalya*).
3. **Tier 3 — Approximate IP Geolocation**: Controlled fallback that clearly warns the user that coordinates are approximate and not GPS-accurate.
4. **Tier 4 — Actionable Error & Retry**: Provides clear guidance without ever silently injecting misleading coordinates.

### 3. 🗺️ Live Reverse Geocoding
- Integrates **OpenStreetMap Nominatim** to resolve raw coordinates into human-readable localities (e.g., *"Mahayogi Vemana Road, Koramangala East, Bengaluru"*).
- Features an **offline spatial heuristic fallback** calibrated with bounding coordinates for 16 major Bengaluru sectors (Koramangala, Indiranagar, Whitefield, Electronic City, Hebbal, Yelahanka, Peenya, Malleshwaram, etc.).

### 4. 🏥 Real Hospital Discovery via OpenStreetMap (Overpass API)
- Queries live OpenStreetMap geographic nodes, ways, and relations around the accident coordinates for `amenity=hospital`, `healthcare=hospital`, and `amenity=clinic[emergency=yes]`.
- Implements automated round-robin **failover across multiple global Overpass API mirrors** (`overpass.openstreetmap.fr`, `overpass-api.de`, `lz4`, `z`).
- Features **in-memory caching with a 15-minute TTL** to protect public community infrastructure from rate-limiting.
- Discards malformed records and removes duplicate facilities using geographic proximity matching ($<150\text{m}$).

### 5. 📏 Accurate Geodesic Distance & Transit Time Estimation
- Implements the **Haversine formula** ($R = 6,371\text{ km}$) to calculate straight-line aerial distance, formatted cleanly (e.g., `0.6 km`, `2.4 km`).
- Estimates emergency road transit time using Bengaluru's urban curvature coefficient ($1.35\times$) at emergency transit speeds ($24\text{ km/h}$ with siren/traffic clearance) plus a 3-minute intake buffer.
- Clearly distinguishes aerial distance from driving distance, with one-click navigation links to Google Maps.

### 6. 🎯 Nearest 5 Hospital Recommendation & Radius Expansion
- Filters, ranks, and highlights the **top 5 nearest hospitals** by distance.
- Starts with a **5 km radius perimeter**. If fewer than 5 hospitals are found, the system **automatically expands** to **10 km**, **15 km**, or **25 km**, informing the user through an alert banner.

### 7. ⚖️ Transparent Capacity Distinction
- **Geographic Existence $\neq$ Emergency Capacity**: Clearly identifies whether a hospital has a connected live bed/doctor telemetry feed.
  - **Verified Registry Hospitals**: Displays live verified ICU beds, trauma resuscitation bays, available duty doctors, and ready ALS/BLS ambulances with last-updated timestamps.
  - **OpenStreetMap Facilities**: Displays real verified locations, addresses, and casualty phones, with an explicit transparent notice: *"Live Bed Availability Not Connected — Mapped geographic facility via OpenStreetMap. Call casualty desk to confirm room & triage readiness."*

### 8. 🗺️ Interactive Leaflet Map Preview
- Custom Leaflet DivIcons with numbered proximity badges (`1` to `5`) for the nearest recommendations.
- Interactive popups featuring direct click-to-call buttons (`tel:`) and directions.
- Draggable accident pin with pulsing animation and search radius perimeter rings.

### 9. 🔐 Hospital Administration & Platform Governance Portals
- **Hospital Admin Portal**: Authenticated CMIOs and casualty superintendents can atomically update bed capacity, on-duty doctors, and ambulance fleets with cryptographic audit logging.
- **Platform Governance**: Platform operations can review institutional KPME license access requests and monitor platform-wide data freshness.

---

## 🏗️ Architecture & Monorepo Structure

```
Surge_Watch/
├── client/                     # Frontend Application (Vite + React 19 + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # HospitalCard, MapPreview, RadiusSelector, etc.
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
│   │   ├── testStageNearbyHospitals.ts # Automated 23-point verification suite
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
- **Node.js**: v18.x or v20.x or v22.x
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

SurgeWatch includes comprehensive test suites to verify spatial math, coordinate bounds, Overpass discovery, radius expansion, reverse geocoding, and capacity transparency:

Run the nearby discovery test suite:
```bash
npm run test:nearby
```

**Verified Test Scenarios:**
- ✅ Missing or invalid coordinates rejected (`400 Bad Request`).
- ✅ Geographic hospital discovery around Koramangala returns 5 nearest hospitals sorted by distance.
- ✅ Search around North Bengaluru (Hebbal) returns facilities local to Hebbal (e.g. *Aster CMI*), proving dynamic coordinate searching across Bengaluru.
- ✅ Search radius automatically expands to 10 km or 15 km when candidate results are sparse.
- ✅ Reverse geocoding resolves coordinates to local Bengaluru neighborhoods via Nominatim.
- ✅ IP geolocation fallback flags `isGpsAccurate: false` with an explicit user disclaimer.
- ✅ Capacity transparency properly distinguishes connected telemetry from OpenStreetMap facilities.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/hospitals/nearby` | Discovers nearest 5 hospitals via OpenStreetMap & local registry with auto-expansion | `lat`, `lon` (or `lng`), `radiusKm`, `limit`, `autoExpand` |
| `GET` | `/api/v1/hospitals/search` | Radius search with facility filters (`ALL`, `ICU`, `TRAUMA`, `AMBULANCE`) | `lat`, `lng`, `radius`, `service`, `sortBy` |
| `GET` | `/api/v1/hospitals/:id` | Detailed hospital profile, bed breakdown, and doctor metrics | None |
| `GET` | `/api/v1/location/reverse-geocode`| Resolves coordinates to neighborhood address via Nominatim | `lat`, `lng` |
| `GET` | `/api/v1/location/ip-lookup` | Returns approximate city-level IP location with disclaimer | None |
| `POST`| `/api/v1/auth/login-admin` | Authenticates hospital administrator & returns JWT token | Body: `{ email, password }` |
| `PUT` | `/api/v1/admin/hospitals/:id/resources` | Updates available beds, doctors, and ambulances | Bearer Token, Body: `{ beds, staff, ambulances }` |

Interactive API documentation is also available live at:
👉 **`http://localhost:5000/api/docs`**

---

## 🔒 Security, Privacy & Git Best Practices

- **Zero Committed Secrets**: `.env` and `dev.db` files are strictly excluded via `.gitignore`.
- **Environment Template**: `.env.example` provides a sanitized configuration reference.
- **Privacy Protection**: Database files, system logs, build caches, and private keys are barred from git staging.
- **Input Sanitization**: Geographic coordinates are bounded and validated against strict numerical limits before processing.

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
