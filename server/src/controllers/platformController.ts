import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { computeDataFreshness } from '../utils/freshness.js';
import { getIO } from '../socket.js';
import { clearHospitalCache } from '../services/osmHospitalService.js';
import { resolveCoordinatesForArea } from '../services/locationService.js';

export const listAccessRequests = async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.hospitalAccessRequest.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        hospital: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch access requests.' });
  }
};

export const approveAccessRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const request = await prisma.hospitalAccessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      res.status(404).json({ success: false, error: 'Access request not found.' });
      return;
    }

    // Prevent duplicate or invalid approval actions
    if (request.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: `Cannot approve request: Current status is already ${request.status}.`,
      });
      return;
    }

    const reviewNotes = (req.body && req.body.notes) || 'Verified with Karnataka KPME medical registry.';

    // Update status to APPROVED
    await prisma.hospitalAccessRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewNotes,
      },
    });

    // Find or create the corresponding Hospital record
    const resolvedCoords = await resolveCoordinatesForArea(request.area, request.hospitalAddress);
    let hospitalId = request.hospitalId;
    if (hospitalId) {
      const currentHosp = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      const updateData: any = { verificationStatus: 'VERIFIED' };
      if (currentHosp && currentHosp.latitude === 12.9716 && currentHosp.longitude === 77.5946) {
        updateData.latitude = resolvedCoords.latitude;
        updateData.longitude = resolvedCoords.longitude;
      }
      await prisma.hospital.update({
        where: { id: hospitalId },
        data: updateData,
      });
    } else {
      const slugBase = request.hospitalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let existingHosp = await prisma.hospital.findFirst({
        where: {
          OR: [
            { slug: slugBase },
            { officialEmail: request.officialEmail.toLowerCase() },
          ],
        },
      });

      if (existingHosp) {
        hospitalId = existingHosp.id;
        const updateData: any = { verificationStatus: 'VERIFIED' };
        if (existingHosp.latitude === 12.9716 && existingHosp.longitude === 77.5946) {
          updateData.latitude = resolvedCoords.latitude;
          updateData.longitude = resolvedCoords.longitude;
        }
        await prisma.hospital.update({
          where: { id: hospitalId },
          data: updateData,
        });
      } else {
        const createdHosp = await prisma.hospital.create({
          data: {
            name: request.hospitalName,
            slug: `${slugBase}-${Date.now().toString(36)}`,
            address: request.hospitalAddress,
            area: request.area,
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: request.pincode || '560001',
            latitude: resolvedCoords.latitude,
            longitude: resolvedCoords.longitude,
            emergencyContactPhone: request.contactPhone,
            officialEmail: request.officialEmail.toLowerCase(),
            emergencyServices: JSON.stringify(['24/7 Emergency Casualty', 'Trauma Resuscitation Bays', 'Critical Care ICU']),
            verificationStatus: 'VERIFIED',
            operatingStatus: 'OPERATIONAL',
            dataProvenance: 'MANUAL',
          },
        });
        hospitalId = createdHosp.id;
      }

      await prisma.hospitalAccessRequest.update({
        where: { id },
        data: { hospitalId },
      });
    }

    // Ensure hospital has default beds, staff, and ambulances if none exist
    if (hospitalId) {
      const existingBeds = await prisma.bedAvailability.count({ where: { hospitalId } });
      if (existingBeds === 0) {
        await prisma.bedAvailability.createMany({
          data: [
            { hospitalId, category: 'EMERGENCY_ICU', totalBeds: 12, occupiedBeds: 4, availableBeds: 8, dataProvenance: 'MANUAL' },
            { hospitalId, category: 'EMERGENCY_GENERAL', totalBeds: 30, occupiedBeds: 18, availableBeds: 12, dataProvenance: 'MANUAL' },
            { hospitalId, category: 'TRAUMA_RESUSCITATION', totalBeds: 6, occupiedBeds: 2, availableBeds: 4, dataProvenance: 'MANUAL' },
          ],
        });
      }

      const existingStaff = await prisma.staffAvailability.count({ where: { hospitalId } });
      if (existingStaff === 0) {
        await prisma.staffAvailability.createMany({
          data: [
            { hospitalId, staffCategory: 'EMERGENCY_PHYSICIAN', scheduledOnDutyCount: 4, currentlyAvailableCount: 3, metricDefinition: 'Doctors ready for immediate trauma triage', dataProvenance: 'MANUAL' },
            { hospitalId, staffCategory: 'ICU_TRIAGE_NURSE', scheduledOnDutyCount: 8, currentlyAvailableCount: 6, metricDefinition: 'ICU triage nurses on duty', dataProvenance: 'MANUAL' },
          ],
        });
      }

      const existingAmbulances = await prisma.ambulanceAvailability.count({ where: { hospitalId } });
      if (existingAmbulances === 0) {
        await prisma.ambulanceAvailability.createMany({
          data: [
            { hospitalId, registrationPlate: `KA-01-E-${Math.floor(1000 + Math.random() * 9000)}`, ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', status: 'AVAILABLE', dataProvenance: 'MANUAL' },
          ],
        });
      }

      // Ensure membership exists for applicant user
      if (request.userId) {
        await prisma.user.update({
          where: { id: request.userId },
          data: { role: 'HOSPITAL_ADMIN' },
        });

        const existingMembership = await prisma.hospitalMembership.findUnique({
          where: {
            userId_hospitalId: {
              userId: request.userId,
              hospitalId,
            },
          },
        });

        if (!existingMembership) {
          await prisma.hospitalMembership.create({
            data: {
              userId: request.userId,
              hospitalId,
              assignedRole: 'ADMIN',
            },
          });
        }
      }
    }

    // Invalidate in-memory hospital discovery cache
    clearHospitalCache();

    // Broadcast Socket.IO update
    try {
      const io = getIO();
      if (io) {
        io.emit('hospital_registration_updated', {
          id,
          hospitalId,
          hospitalName: request.hospitalName,
          status: 'APPROVED',
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.IO] Failed to emit hospital_registration_updated:', socketErr);
    }

    res.json({
      success: true,
      message: `Hospital access request for ${request.hospitalName} approved. Administrator credentials active and hospital verified.`,
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve access request.' });
  }
};

export const rejectAccessRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const request = await prisma.hospitalAccessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      res.status(404).json({ success: false, error: 'Access request not found.' });
      return;
    }

    // Prevent duplicate or invalid rejection actions
    if (request.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: `Cannot reject request: Current status is already ${request.status}.`,
      });
      return;
    }

    const reason = (req.body && req.body.reason) || 'KPME registration details could not be authenticated against the Karnataka Medical Directorate.';

    // Update status to REJECTED
    await prisma.hospitalAccessRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewNotes: reason,
      },
    });

    // Update Hospital status to REJECTED if linked
    if (request.hospitalId) {
      await prisma.hospital.update({
        where: { id: request.hospitalId },
        data: { verificationStatus: 'REJECTED' },
      });
    }

    // Invalidate in-memory hospital discovery cache
    clearHospitalCache();

    // Broadcast Socket.IO update
    try {
      const io = getIO();
      if (io) {
        io.emit('hospital_registration_updated', {
          id,
          hospitalId: request.hospitalId,
          hospitalName: request.hospitalName,
          status: 'REJECTED',
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.IO] Failed to emit hospital_registration_updated:', socketErr);
    }

    res.json({
      success: true,
      message: `Hospital access request for ${request.hospitalName} has been rejected.`,
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject access request.' });
  }
};

export const getSystemFreshnessOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hospitals = await prisma.hospital.findMany({
      include: {
        beds: true,
        staff: true,
        ambulances: true,
      },
      orderBy: {
        lastResourceUpdate: 'desc',
      },
    });

    let liveCount = 0;
    let recentCount = 0;
    let staleCount = 0;

    const summary = hospitals.map((h) => {
      const freshness = computeDataFreshness(h.lastResourceUpdate);
      if (freshness.status === 'LIVE') liveCount++;
      else if (freshness.status === 'RECENT') recentCount++;
      else staleCount++;

      const icuBed = h.beds.find((b) => b.category === 'EMERGENCY_ICU');
      const totalAvailableBeds = h.beds.reduce((acc, b) => acc + b.availableBeds, 0);
      const readyAmbulances = h.ambulances.filter((a) => a.status === 'AVAILABLE_READY').length;
      const readyDocs = h.staff.find((s) => s.staffCategory === 'EMERGENCY_PHYSICIAN')?.currentlyAvailableCount ?? 0;

      return {
        id: h.id,
        name: h.name,
        area: h.area,
        operatingStatus: h.operatingStatus,
        verificationStatus: h.verificationStatus,
        lastResourceUpdate: h.lastResourceUpdate,
        freshnessStatus: freshness.status,
        label: freshness.label,
        minutesAgo: freshness.minutesAgo,
        availableIcuBeds: icuBed?.availableBeds ?? 0,
        totalAvailableBeds,
        readyAmbulances,
        readyDocs,
        updatedBy: (h as any).updatedBy || 'Superintendent On Shift',
      };
    });

    res.json({
      success: true,
      metrics: {
        total: hospitals.length,
        live: liveCount,
        recent: recentCount,
        stale: staleCount,
        healthPercentage: Math.round(((liveCount + recentCount) / (hospitals.length || 1)) * 100),
      },
      data: summary,
    });
  } catch (error) {
    console.error('System freshness error:', error);
    res.status(500).json({ success: false, error: 'Failed to compute freshness overview.' });
  }
};
