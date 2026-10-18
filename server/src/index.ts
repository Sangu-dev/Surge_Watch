import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
  },
});

app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'SurgeWatch Emergency Backend',
    database: 'SQLite Relational Database (Prisma ORM)',
    geographicTarget: 'Bengaluru, Karnataka, India',
    timestamp: new Date().toISOString(),
  });
});

// Interactive API Documentation Endpoint
app.get('/api/docs', (_req, res) => {
  res.json({
    title: 'SurgeWatch Emergency Hospital Discovery API',
    version: '1.0.0',
    description: 'REST API for emergency hospital discovery, bed availability, trauma triage metrics, and administrative verification in Bengaluru.',
    endpoints: {
      discovery: [
        {
          method: 'GET',
          path: '/api/v1/hospitals/nearby',
          access: 'Public',
          description: 'Discovers nearest hospitals around an accident location using OpenStreetMap Overpass API and local emergency registry, calculating Haversine distance, with automatic 5km -> 10km -> 15km -> 25km radius expansion.',
          queryParams: ['lat', 'lon', 'radiusKm', 'limit', 'autoExpand'],
        },
        {
          method: 'GET',
          path: '/api/v1/hospitals/search',
          access: 'Public',
          description: 'Geographic radius search around an accident location (5, 10, 15, 20 km) with facility filtering and sorting.',
          queryParams: ['lat', 'lng', 'radius', 'service', 'sortBy'],
        },
        {
          method: 'GET',
          path: '/api/v1/hospitals/:id',
          access: 'Public',
          description: 'Detailed hospital profile with bed breakdown, staff metrics, ambulance fleet, and data freshness.',
        },
      ],
      location: [
        {
          method: 'GET',
          path: '/api/v1/location/reverse-geocode',
          access: 'Public',
          description: 'Resolves GPS coordinates to human-readable Bengaluru address and neighborhood via OpenStreetMap Nominatim with local spatial heuristic fallback.',
          queryParams: ['lat', 'lng'],
        },
        {
          method: 'GET',
          path: '/api/v1/location/ip-lookup',
          access: 'Public',
          description: 'Returns approximate IP-derived location with explicit non-GPS disclaimer.',
        },
      ],
      authentication: [
        { method: 'POST', path: '/api/v1/auth/register-patient', access: 'Public', description: 'Patient signup' },
        { method: 'POST', path: '/api/v1/auth/login-patient', access: 'Public', description: 'Patient authentication' },
        { method: 'POST', path: '/api/v1/auth/login-admin', access: 'Public', description: 'Hospital & Platform Admin authentication' },
        { method: 'POST', path: '/api/v1/auth/request-hospital-access', access: 'Public', description: 'Institutional KPME license application' },
        { method: 'GET', path: '/api/v1/auth/me', access: 'Bearer Token', description: 'Session profile' },
      ],
      hospitalAdministration: [
        {
          method: 'PUT',
          path: '/api/v1/admin/hospitals/:hospitalId/resources',
          access: 'Hospital Administrator (Enforced Ownership)',
          description: 'Atomically updates bed, staff, and ambulance availability, records audit log, and emits Socket.IO event.',
        },
        {
          method: 'GET',
          path: '/api/v1/admin/hospitals/:hospitalId/audits',
          access: 'Hospital Administrator (Enforced Ownership)',
          description: 'Retrieves chronological audit log of all capacity modifications.',
        },
      ],
      platformGovernance: [
        { method: 'GET', path: '/api/v1/platform/requests', access: 'Platform Administrator', description: 'List pending hospital verification requests' },
        { method: 'POST', path: '/api/v1/platform/requests/:id/approve', access: 'Platform Administrator', description: 'Approve hospital registration' },
        { method: 'GET', path: '/api/v1/platform/freshness', access: 'Platform Administrator', description: 'Platform-wide data freshness monitor' },
      ],
    },
  });
});

// Mount modular route trees (supports both /api/v1/ and /api/ prefixes)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/platform', platformRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/v1', emergencyRoutes);
app.use('/api', emergencyRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.io live event broadcasting
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('subscribe_hospital', (hospitalId: string) => {
    socket.join(`hospital:${hospitalId}`);
  });

  // Emergency Live GPS Tracking
  socket.on('emergency_track_start', (data) => {
    console.log(`[Socket.io] Live emergency tracking started for socket: ${socket.id}`, data);
    socket.join('emergency_active_track');
    socket.emit('emergency_track_confirmed', {
      tracking: true,
      socketId: socket.id,
      startedAt: new Date().toISOString(),
    });
  });

  socket.on('emergency_location_update', (locationData) => {
    // Broadcast live moving position to emergency dispatchers/room
    socket.to('emergency_active_track').emit('emergency_live_position', {
      ...locationData,
      socketId: socket.id,
      serverTimestamp: new Date().toISOString(),
    });
  });

  socket.on('emergency_track_stop', () => {
    console.log(`[Socket.io] Live emergency tracking stopped for socket: ${socket.id}`);
    socket.leave('emergency_active_track');
    socket.emit('emergency_track_stopped', { tracking: false });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  SURGEWATCH BACKEND API RUNNING ON PORT ${PORT} `);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`=================================================`);
});

export { app, server };
