import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { computeDataFreshness } from '../utils/freshness.js';

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

    // Update status to APPROVED
    await prisma.hospitalAccessRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewNotes: (req.body && req.body.notes) || 'Verified with Karnataka KPME medical registry.',
      },
    });

    // Ensure applicant user has HOSPITAL_ADMIN role
    if (request.userId) {
      await prisma.user.update({
        where: { id: request.userId },
        data: { role: 'HOSPITAL_ADMIN' },
      });
    }

    res.json({
      success: true,
      message: `Hospital access request for ${request.hospitalName} approved. Administrator credentials active.`,
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

    const reason = (req.body && req.body.reason) || 'KPME registration details could not be authenticated against the Karnataka Medical Directorate.';

    // Update status to REJECTED
    await prisma.hospitalAccessRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewNotes: reason,
      },
    });

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
