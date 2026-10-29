# 🚑 SurgeWatch BLR

> **Real-time Emergency Hospital Discovery & Capacity Signaling Platform for Bengaluru**

SurgeWatch connects citizens, bystanders, and emergency responders to nearby emergency hospitals across Bengaluru during road traffic accidents and critical medical episodes. It provides live distance calculations, verified bed availability, on-duty clinical staff, ambulance readiness, and direct emergency routing.

---

## ✨ Key Features

- **📍 Instant Location & GPS**: Detects precise device GPS with native browser permissions, or select accident spots manually via interactive map clicks or Bengaluru landmark presets.
- **🎯 Dynamic Radius Perimeter**: Discover all matching facilities strictly within **5 km**, **10 km**, or **15 km** (no arbitrary record caps).
- **🔍 Active Capacity Filters & Sorting**:
  - **Filters**: *All Facilities*, *ICU Available*, *ER Beds*, *Doctors on Duty*, *Nurses on Duty*, *Ambulances Ready*, *Level 1 Trauma*.
  - **Sorting**: *Shortest Distance (Aerial)*, *Most Available Beds*, *Most Ready Ambulances*.
- **🗺️ Interactive Map**: Real-time Leaflet map powered by CARTO tiles, showing user location, perimeter boundaries, and ranked hospital pins synchronized with results.
- **🛏️ Live Hospital Capacity**: Departmental breakdown of ICU beds, general emergency/trauma bays, on-duty doctors, and registered ambulance fleets with license plates.
- **🚑 Emergency Ambulance SOS**: Request and track hospital ambulance dispatch with simulated status lifecycle (`AVAILABLE` → `ASSIGNED` → `EN_ROUTE` → `RELEASED`).

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React-Leaflet, Lucide Icons |
| **Backend** | Node.js, Express, Socket.IO (Live Telemetry) |
| **Database** | Prisma ORM, SQLite (`dev.db`) |
| **Geospatial & Maps** | OpenStreetMap Overpass API, CARTO Basemaps, Haversine Geodesic Math |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **npm** (v9+)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Sangu-dev/Surge_Watch.git
cd Surge_Watch

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
cd ..
```

### 3. Environment Setup

**Client (`client/.env`)**:
```env
VITE_MAPS_API_KEY=your_carto_maps_api_key_here
```

**Server (`server/.env`)**:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="surgewatch_super_secure_emergency_secret_2026"
PORT=5000
MAPS_API_KEY="your_carto_maps_api_key_here"
```

### 4. Initialize Database & Seed

```bash
cd server
npx prisma db push
npm run seed
cd ..
```

### 5. Run the Application

In two separate terminals:

```bash
# Terminal 1 — Backend Server (Port 5000)
npm run dev:server

# Terminal 2 — Frontend Application (Port 5173)
npm run dev:client
```

Visit:
- **`http://localhost:5173`** — Home & Landing Page
- **`http://localhost:5173/find`** — Real-Time Emergency Discovery Matrix & Map
- **`http://localhost:5173/admin/login`** — Hospital Admin Portal

---

## ⚠️ Emergency Notice

SurgeWatch is an emergency discovery and capacity signaling tool. In life-threatening emergencies, always dial:
- **112** — National Emergency Services (India)
- **108** — Emergency Ambulance Dispatch

---

## 📄 License

Licensed under the [ISC License](LICENSE).
