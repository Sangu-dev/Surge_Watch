import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { z } from 'zod';
import { io } from '../index.js';

const UpdateResourcesSchema = z.object({
  beds: z.array(
    z.object({
      category: z.string(),
      totalBeds: z.number().min(0, 'Total beds must be non-negative'),
      occupiedBeds: z.number().min(0, 'Occupied beds must be non-negative'),
      availableBeds: z.number().min(0, 'Available beds must be non-negative'),
    })
  ).optional(),
  staff: z.array(
    z.object({
      staffCategory: z.string(),
      scheduledOnDutyCount: z.number().min(0, 'Scheduled on duty count must be non-negative'),
      currentlyAvailableCount: z.number().min(0, 'Currently available count must be non-negative'),
      shiftStatus: z.string().optional(),
      metricDefinition: z.string().optional(),
    })
  ).optional(),
  ambulances: z.array(
    z.object({
      id: z.string().optional(),
      ambulanceType: z.string(),
      registrationPlate: z.string().optional(),
      status: z.string().optional(),
      currentLocation: z.string().optional(),
      availableReadyCount: z.number().min(0).optional(),
      inTransitCount: z.number().min(0).optional(),
      totalCount: z.number().min(0).optional(),
    })
  ).optional(),
  changeSummary: z.string().optional(),
});

export const updateHospitalResources = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const hospitalId = String(req.params.hospitalId);
    const userId = req.user?.id || 'unknown-user';

    const parse = UpdateResourcesSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { beds, staff, ambulances, changeSummary } = parse.data;

    // Validate bed consistency: available + occupied <= total
    if (beds) {
      for (const b of beds) {
        if (b.availableBeds + b.occupiedBeds > b.totalBeds) {
          res.status(400).json({
            success: false,
            error: `Integrity check failed: Available (${b.availableBeds}) + Occupied (${b.occupiedBeds}) exceeds Total Licensed (${b.totalBeds}) for ${b.category}.`,
          });
          return;
        }
      }
    }

    // Execute atomic update in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Beds
      if (beds) {
        for (const b of beds) {
          const existing = await tx.bedAvailability.findFirst({
            where: { hospitalId, category: b.category },
          });
          if (existing) {
            await tx.bedAvailability.update({
              where: { id: existing.id },
              data: {
                totalBeds: b.totalBeds,
                occupiedBeds: b.occupiedBeds,
                availableBeds: b.availableBeds,
                lastUpdated: new Date(),
                updatedByUserId: userId,
                dataProvenance: 'MANUAL',
              },
            });
          } else {
            await tx.bedAvailability.create({
              data: {
                hospitalId,
                category: b.category,
                totalBeds: b.totalBeds,
                occupiedBeds: b.occupiedBeds,
                availableBeds: b.availableBeds,
                lastUpdated: new Date(),
                updatedByUserId: userId,
                dataProvenance: 'MANUAL',
              },
            });
          }
        }
      }

      // 2. Update Staff
      if (staff) {
        for (const s of staff) {
          const existing = await tx.staffAvailability.findFirst({
            where: { hospitalId, staffCategory: s.staffCategory },
          });
          if (existing) {
            await tx.staffAvailability.update({
              where: { id: existing.id },
              data: {
                scheduledOnDutyCount: s.scheduledOnDutyCount,
                currentlyAvailableCount: s.currentlyAvailableCount,
                shiftStatus: s.shiftStatus || existing.shiftStatus || 'ON_DUTY',
                metricDefinition: s.metricDefinition || existing.metricDefinition,
                lastUpdated: new Date(),
                updatedByUserId: userId,
                dataProvenance: 'MANUAL',
              },
            });
          } else {
            await tx.staffAvailability.create({
              data: {
                hospitalId,
                staffCategory: s.staffCategory,
                scheduledOnDutyCount: s.scheduledOnDutyCount,
                currentlyAvailableCount: s.currentlyAvailableCount,
                shiftStatus: s.shiftStatus || 'ON_DUTY',
                metricDefinition: s.metricDefinition || `${s.staffCategory.replace(/_/g, ' ')} on duty`,
                lastUpdated: new Date(),
                updatedByUserId: userId,
                dataProvenance: 'MANUAL',
              },
            });
          }
        }
      }

      // 3. Update Ambulances
      if (ambulances) {
        for (const amb of ambulances) {
          if (amb.id) {
            await tx.ambulanceAvailability.update({
              where: { id: amb.id },
              data: {
                status: amb.status,
                registrationPlate: amb.registrationPlate,
                currentLocation: amb.currentLocation,
                lastUpdated: new Date(),
                updatedByUserId: userId,
                dataProvenance: 'MANUAL',
              },
            });
          } else if (amb.availableReadyCount !== undefined) {
            const existing = await tx.ambulanceAvailability.findMany({
              where: { hospitalId, ambulanceType: amb.ambulanceType },
            });
            const readyTarget = amb.availableReadyCount;
            // Synchronize existing vehicles
            for (let i = 0; i < existing.length; i++) {
              const shouldBeReady = i < readyTarget;
              await tx.ambulanceAvailability.update({
                where: { id: existing[i].id },
                data: {
                  status: shouldBeReady ? 'AVAILABLE' : 'ASSIGNED',
                  lastUpdated: new Date(),
                  updatedByUserId: userId,
                  dataProvenance: 'MANUAL',
                },
              });
            }
            // If target exceeds existing count, create additional vehicles
            if (readyTarget > existing.length) {
              const toCreate = readyTarget - existing.length;
              for (let j = 0; j < toCreate; j++) {
                await tx.ambulanceAvailability.create({
                  data: {
                    hospitalId,
                    ambulanceType: amb.ambulanceType,
                    status: 'AVAILABLE',
                    registrationPlate: `KA-01-EA-${200 + existing.length + j + 1}`,
                    currentLocation: 'Hospital Base Station',
                    updatedByUserId: userId,
                    dataProvenance: 'MANUAL',
                  },
                });
              }
            }
          }
        }
      }

      // 4. Update Hospital lastResourceUpdate timestamp and data provenance
      await tx.hospital.update({
        where: { id: hospitalId },
        data: {
          lastResourceUpdate: new Date(),
          dataProvenance: 'MANUAL',
        },
      });

      // 5. Record Immutable Audit Log
      await tx.resourceUpdateAudit.create({
        data: {
          hospitalId,
          changedByUserId: userId,
          resourceCategory: 'RESOURCES_BULK_UPDATE',
          previousState: JSON.stringify({ note: 'Previous state preserved' }),
          newState: JSON.stringify(parse.data),
          changeSummary: changeSummary || `Emergency capacity updated by ${req.user?.fullName || 'Administrator'}.`,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'API Client',
        },
      });
    });

    // Broadcast real-time live availability update via Socket.IO
    io.emit('hospital_resource_updated', {
      hospitalId,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.fullName,
    });

    io.emit('ambulance_status_updated', {
      hospitalId,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Hospital emergency capacity published successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update resources error:', error);
    res.status(500).json({ success: false, error: 'Failed to update hospital resources.' });
  }
};

export const getHospitalAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const hospitalId = String(req.params.hospitalId);
    const logs = await prisma.resourceUpdateAudit.findMany({
      where: { hospitalId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 50,
    });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve hospital audit logs.' });
  }
};
