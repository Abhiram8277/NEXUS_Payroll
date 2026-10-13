import { prisma } from '../../config/prisma';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { EmailService } from '../email/email.service';

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
      const err: any = new Error('Invalid date provided.');
      err.statusCode = 400;
      throw err;
    }
    if (from > to) {
      const err: any = new Error('From date cannot be after To date.');
      err.statusCode = 400;
      throw err;
    }

    const days = this.calculateDays(from, to);
    const year = from.getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      const leaveType = await tx.leaveType.findUnique({ where: { id: data.leaveTypeId } });
      if (!leaveType) throw new Error('Leave type not found.');

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

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending: balance.pending + days,
          available: Math.max(0, balance.available - days),
        },
      });

      return { request, excessLopDays };
    });

    // Notify HR/Admin via EmailService
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: [Role.HR, Role.ADMIN] }, isActive: true },
      select: { email: true },
    });
    for (const hr of hrUsers) {
      await EmailService.sendLeaveNotificationEmail({
        to: hr.email,
        employeeName: `${result.request.employee.firstName} ${result.request.employee.lastName}`,
        leaveType: result.request.leaveType.name,
        fromDate: from.toISOString().split('T')[0],
        toDate: to.toISOString().split('T')[0],
        days,
        status: 'APPLIED',
      }).catch(() => {});
    }

    return {
      ...result.request,
      request: result.request,
      excessLopDays: result.excessLopDays,
    };
  }

  static async updateStatus(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    reviewerId: string,
    rejectionReason?: string
  ) {
    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { leaveType: true, employee: true },
      });
      if (!req) {
        const err: any = new Error('Leave request not found.');
        err.statusCode = 404;
        throw err;
      }

      if (req.status !== LeaveRequestStatus.APPLIED) {
        const err: any = new Error(`Cannot update request that is already ${req.status}`);
        err.statusCode = 400;
        throw err;
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

    if (status === 'APPROVED' || status === 'REJECTED') {
      await EmailService.sendLeaveNotificationEmail({
        to: updated.employee.email,
        employeeName: `${updated.employee.firstName} ${updated.employee.lastName}`,
        leaveType: updated.leaveType.name,
        fromDate: updated.fromDate.toISOString().split('T')[0],
        toDate: updated.toDate.toISOString().split('T')[0],
        days: updated.days,
        status,
        rejectionReason,
      }).catch(() => {});
    }

    return updated;
  }

  static async cancelRequest(requestId: string, user: { id: string; email: string; role: Role; employeeId?: string }) {
    const req = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!req) {
      const err: any = new Error('Leave request not found.');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === Role.EMPLOYEE && req.employeeId !== user.employeeId) {
      const err: any = new Error('Forbidden: You can only cancel your own leave requests.');
      err.statusCode = 403;
      throw err;
    }

    return this.updateStatus(requestId, 'CANCELLED', user.email);
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
