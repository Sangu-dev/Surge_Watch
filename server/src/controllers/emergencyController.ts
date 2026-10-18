import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { io } from '../index.js';
import { calculateHaversineDistance } from '../utils/spatial.js';

/**
 * Lists all ambulances in the system with vehicle identifiers, hospital details, and statuses
 * GET /api/v1/ambulances
 */
export const getAllAmbulances = async (_req: Request, res: Response): Promise<void> => {
  try {
    const ambulances = await prisma.ambulanceAvailability.findMany({
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            area: true,
            emergencyContactPhone: true,
          },
        },
        assignedEmergency: true,
      },
      orderBy: { lastUpdated: 'desc' },
    });

    const totalCount = ambulances.length;
    const availableCount = ambulances.filter(
      (a) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY'
    ).length;
    const assignedCount = ambulances.filter(
      (a) =>
        a.status === 'ASSIGNED' ||
        a.status === 'EN_ROUTE' ||
        a.status === 'AT_SCENE' ||
        a.status === 'DISPATCHED_IN_TRANSIT'
    ).length;

    res.json({
      success: true,
      summary: {
        totalAmbulances: totalCount,
        availableAmbulances: availableCount,
        assignedAmbulances: assignedCount,
        maintenanceAmbulances: totalCount - availableCount - assignedCount,
      },
      data: ambulances,
    });
  } catch (error) {
    console.error('Get all ambulances error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve ambulance fleet.' });
  }
};

/**
 * Lists ambulances for a specific hospital
 * GET /api/v1/hospitals/:hospitalId/ambulances
 */
export const getHospitalAmbulances = async (req: Request, res: Response): Promise<void> => {
  try {
    const hospitalId = String(req.params.hospitalId);
    const ambulances = await prisma.ambulanceAvailability.findMany({
      where: { hospitalId },
      include: {
        assignedEmergency: true,
      },
      orderBy: { lastUpdated: 'desc' },
    });

    const total = ambulances.length;
    const available = ambulances.filter(
      (a) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY'
    ).length;
    const assigned = ambulances.filter(
      (a) =>
        a.status === 'ASSIGNED' ||
        a.status === 'EN_ROUTE' ||
        a.status === 'AT_SCENE' ||
        a.status === 'DISPATCHED_IN_TRANSIT'
    ).length;

    res.json({
      success: true,
      hospitalId,
      summary: {
        totalAmbulances: total,
        availableAmbulances: available,
        assignedAmbulances: assigned,
      },
      data: ambulances,
    });
  } catch (error) {
    console.error('Get hospital ambulances error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve hospital ambulances.' });
  }
};

/**
 * Updates ambulance status and location
 * PATCH /api/v1/admin/ambulances/:id/status
 */
export const updateAmbulanceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, currentLocation, currentLatitude, currentLongitude, dispatchNotes } = req.body;

    const validStatuses = [
      'AVAILABLE',
      'AVAILABLE_READY',
      'ASSIGNED',
      'EN_ROUTE',
      'AT_SCENE',
      'COMPLETED',
      'DISPATCHED_IN_TRANSIT',
      'MAINTENANCE',
    ];

    if (status && !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const existing = await prisma.ambulanceAvailability.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Ambulance record not found.' });
      return;
    }

    const updated = await prisma.ambulanceAvailability.update({
      where: { id },
      data: {
        status: status || existing.status,
        currentLocation: currentLocation !== undefined ? currentLocation : existing.currentLocation,
        currentLatitude: currentLatitude !== undefined ? currentLatitude : existing.currentLatitude,
        currentLongitude: currentLongitude !== undefined ? currentLongitude : existing.currentLongitude,
        dispatchNotes: dispatchNotes !== undefined ? dispatchNotes : existing.dispatchNotes,
        lastUpdated: new Date(),
        dataProvenance: 'MANUAL',
      },
      include: {
        hospital: {
          select: { id: true, name: true },
        },
      },
    });

    // Broadcast real-time ambulance status update
    io.emit('ambulance_status_updated', {
      ambulanceId: updated.id,
      hospitalId: updated.hospitalId,
      status: updated.status,
      currentLocation: updated.currentLocation,
      registrationPlate: updated.registrationPlate,
      updatedAt: updated.lastUpdated.toISOString(),
    });

    io.emit('hospital_resource_updated', {
      hospitalId: updated.hospitalId,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Ambulance Fleet Operator',
    });

    res.json({
      success: true,
      message: 'Ambulance record updated successfully in database.',
      disclaimer: 'Internal application status transition recorded. Telemetry does not verify real-world vehicle dispatch or physical movement.',
      data: updated,
    });
  } catch (error) {
    console.error('Update ambulance error:', error);
    res.status(500).json({ success: false, error: 'Failed to update ambulance status.' });
  }
};

/**
 * Requests and assigns an ambulance for an emergency (SOS Workflow)
 * POST /api/v1/emergency/dispatch
 */
export const dispatchAmbulance = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hospitalId,
      patientName,
      contactPhone,
      emergencyType = 'TRAUMA_ACCIDENT',
      severity = 'CRITICAL',
      latitude,
      longitude,
      pickupAddress,
      dispatchNotes,
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, error: 'Missing coordinates: latitude and longitude are required.' });
      return;
    }

    let targetHospitalId = hospitalId;

    // If no hospitalId specified, find nearest hospital with an available ambulance
    if (!targetHospitalId) {
      const allHospitals = await prisma.hospital.findMany({
        include: {
          ambulances: true,
        },
      });

      const hospitalsWithAvailableAmbulances = allHospitals.filter((h) =>
        h.ambulances.some((a) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY')
      );

      if (hospitalsWithAvailableAmbulances.length > 0) {
        hospitalsWithAvailableAmbulances.sort((a, b) => {
          const distA = calculateHaversineDistance(latitude, longitude, a.latitude, a.longitude);
          const distB = calculateHaversineDistance(latitude, longitude, b.latitude, b.longitude);
          return distA - distB;
        });
        targetHospitalId = hospitalsWithAvailableAmbulances[0].id;
      } else if (allHospitals.length > 0) {
        targetHospitalId = allHospitals[0].id;
      }
    }

    // Find first available ambulance in target hospital
    const availableAmbulance = targetHospitalId
      ? await prisma.ambulanceAvailability.findFirst({
          where: {
            hospitalId: targetHospitalId,
            status: { in: ['AVAILABLE', 'AVAILABLE_READY'] },
          },
        })
      : null;

    // Create Emergency Request
    const emergencyRequest = await prisma.emergencyRequest.create({
      data: {
        hospitalId: targetHospitalId,
        patientName: patientName || 'Emergency Patient',
        contactPhone: contactPhone || 'Not provided',
        emergencyType,
        severity,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        pickupAddress: pickupAddress || `Accident location near [${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}]`,
        status: availableAmbulance ? 'ASSIGNED' : 'PENDING',
        assignedAmbulanceId: availableAmbulance ? availableAmbulance.id : null,
        dispatchNotes: dispatchNotes || (availableAmbulance ? `Assigned vehicle ${availableAmbulance.registrationPlate}` : 'Awaiting available ambulance vehicle'),
      },
      include: {
        hospital: {
          select: { id: true, name: true, emergencyContactPhone: true },
        },
      },
    });

    let assignedVehicle = null;

    if (availableAmbulance) {
      // Transition ambulance to ASSIGNED
      assignedVehicle = await prisma.ambulanceAvailability.update({
        where: { id: availableAmbulance.id },
        data: {
          status: 'ASSIGNED',
          assignedEmergencyId: emergencyRequest.id,
          lastUpdated: new Date(),
          dispatchNotes: `Assigned to emergency request #${emergencyRequest.id}`,
        },
      });

      // Broadcast real-time Socket.IO events
      io.emit('emergency_dispatched', {
        emergencyId: emergencyRequest.id,
        hospitalId: targetHospitalId,
        ambulanceId: availableAmbulance.id,
        registrationPlate: availableAmbulance.registrationPlate,
        status: 'ASSIGNED',
        timestamp: new Date().toISOString(),
      });

      io.emit('ambulance_status_updated', {
        ambulanceId: availableAmbulance.id,
        hospitalId: targetHospitalId,
        status: 'ASSIGNED',
        registrationPlate: availableAmbulance.registrationPlate,
        updatedAt: new Date().toISOString(),
      });

      io.emit('hospital_resource_updated', {
        hospitalId: targetHospitalId,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Automated Dispatch System',
      });
    }

    res.json({
      success: true,
      assigned: !!availableAmbulance,
      message: availableAmbulance
        ? `Ambulance ${availableAmbulance.registrationPlate} assigned to emergency request.`
        : 'Emergency request registered. No ambulance currently available at selected facility.',
      disclaimer: 'SurgeWatch internal system assignment recorded. This is a local software status transition and does NOT represent an actual physical dispatch or verified vehicle movement. For real-life emergencies, dial 112 or 108.',
      emergencyRequest,
      assignedAmbulance: assignedVehicle,
    });
  } catch (error) {
    console.error('Dispatch ambulance error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute emergency ambulance assignment.' });
  }
};

/**
 * Releases an ambulance from an emergency request back to AVAILABLE
 * POST /api/v1/emergency/:id/release
 */
export const releaseEmergencyDispatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id || req.body.emergencyId || req.body.id || '');

    if (!id) {
      res.status(400).json({ success: false, error: 'Emergency request ID is required.' });
      return;
    }

    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: { assignedAmbulances: true },
    });

    if (!emergency) {
      res.status(404).json({ success: false, error: 'Emergency request not found.' });
      return;
    }

    // Complete the request
    const updatedEmergency = await prisma.emergencyRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    const releasedAmbulances = [];

    // Release assigned ambulances back to AVAILABLE
    if (emergency.assignedAmbulances && emergency.assignedAmbulances.length > 0) {
      for (const amb of emergency.assignedAmbulances) {
        const updatedAmb = await prisma.ambulanceAvailability.update({
          where: { id: amb.id },
          data: {
            status: 'AVAILABLE',
            assignedEmergencyId: null,
            dispatchNotes: `Released upon completion of emergency request #${emergency.id}`,
            lastUpdated: new Date(),
          },
        });
        releasedAmbulances.push(updatedAmb);

        io.emit('ambulance_status_updated', {
          ambulanceId: amb.id,
          hospitalId: amb.hospitalId,
          status: 'AVAILABLE',
          registrationPlate: amb.registrationPlate,
          updatedAt: new Date().toISOString(),
        });

        io.emit('hospital_resource_updated', {
          hospitalId: amb.hospitalId,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Emergency Release Operator',
        });
      }
    }

    io.emit('emergency_resolved', {
      emergencyId: id,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Emergency request completed and ambulance released to AVAILABLE.',
      emergencyRequest: updatedEmergency,
      data: {
        emergency: updatedEmergency,
        ambulance: releasedAmbulances[0] || null,
        releasedAmbulances,
      },
    });
  } catch (error) {
    console.error('Release emergency error:', error);
    res.status(500).json({ success: false, error: 'Failed to release emergency ambulance.' });
  }
};

/**
 * Lists emergency requests
 * GET /api/v1/emergency/requests
 */
export const getEmergencyRequests = async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.emergencyRequest.findMany({
      include: {
        hospital: {
          select: { id: true, name: true, emergencyContactPhone: true },
        },
        assignedAmbulances: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('Get emergency requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve emergency requests.' });
  }
};
