import { prisma } from '../../config/prisma';
import { LeaveRequestStatus } from '@prisma/client';

export class LeavesService {
  static calculateDays(fromDate: Date, toDate: Date): number {
    const start = new Date(fromDate.toISOString().split('T')[0]);
    const end = new Date(toDate.toISOString().split('T')[0]);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  static async applyLeave(data: {
    employeeId: string;
    leaveTypeId: string;
    fromDate: string | Date;
    toDate: string | Date;
    reason: string;
  }) {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new Error('Invalid date provided.');
    }
    if (from > to) {
      throw new Error('From date cannot be after To date.');
    }

    const days = this.calculateDays(from, to);
    const year = from.getFullYear();

    return prisma.$transaction(async (tx) => {
      const leaveType = await tx.leaveType.findUnique({ where: { id: data.leaveTypeId } });
      if (!leaveType) throw new Error('Leave type not found.');

      // Check balance
      let balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: data.employeeId,
            leaveTypeId: data.leaveTypeId,
            year,
          },
        },
      });

      if (!balance) {
        // Initialize balance
        balance = await tx.leaveBalance.create({
          data: {
            employeeId: data.employeeId,
            leaveTypeId: data.leaveTypeId,
            year,
            allocated: leaveType.annualAllocation,
            used: 0,
            pending: 0,
            available: leaveType.annualAllocation,
          },
        });
      }

      // Check if exceeds available balance
      let excessLopDays = 0;
      if (leaveType.isPaid && days > balance.available) {
        excessLopDays = days - balance.available;
      }

      const request = await tx.leaveRequest.create({
        data: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          fromDate: from,
          toDate: to,
          days,
          reason: data.reason.trim(),
          status: LeaveRequestStatus.APPLIED,
        },
        include: { leaveType: true, employee: true },
      });

      // Update pending balance
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending: balance.pending + days,
          available: Math.max(0, balance.available - days),
        },
      });

      return { request, excessLopDays };
    });
  }

  static async updateStatus(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    reviewerId: string,
    rejectionReason?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { leaveType: true },
      });
      if (!req) throw new Error('Leave request not found.');

      if (req.status !== LeaveRequestStatus.APPLIED) {
        throw new Error(`Cannot update request that is already ${req.status}`);
      }

      const year = req.fromDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            year,
          },
        },
      });

      if (status === 'APPROVED') {
        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: balance.used + req.days,
              pending: Math.max(0, balance.pending - req.days),
            },
          });
        }
      } else {
        // REJECTED or CANCELLED: restore available balance
        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pending: Math.max(0, balance.pending - req.days),
              available: balance.available + req.days,
            },
          });
        }
      }

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: status as LeaveRequestStatus,
          approvedById: reviewerId,
          approvedAt: new Date(),
          rejectionReason,
        },
        include: { leaveType: true, employee: true },
      });
    });
  }

  static async listRequests(params: {
    employeeId?: string;
    status?: LeaveRequestStatus;
    departmentId?: string;
  }) {
    const where: any = {};
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;
    if (params.departmentId) where.employee = { departmentId: params.departmentId };

    return prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getBalances(employeeId: string, year = new Date().getFullYear()) {
    return prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }
}
